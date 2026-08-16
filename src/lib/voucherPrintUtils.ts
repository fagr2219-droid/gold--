/**
 * voucherPrintUtils.ts
 * دوال مساعدة للطباعة وإنشاء PDF — مستقلة تماماً عن واجهة التطبيق
 */

// ─────────────────────────────────────────────────
// 1) تحويل صورة خارجية إلى data:URL (لحل CORS)
// ─────────────────────────────────────────────────
export async function fetchLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  // إذا كان data:URL أصلاً
  if (url.startsWith('data:')) return url;

  // إذا كان blob:URL
  if (url.startsWith('blob:')) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  }

  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await blobToDataUrl(blob);
  } catch {
    // CORS failure — try with proxy or give up
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────────
// 2) طباعة السند في iframe مستقل
// ─────────────────────────────────────────────────
export function printVoucherInIframe(elementId: string): void {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    alert('لم يتم العثور على عنصر السند');
    return;
  }

  // إنشاء iframe مخفي
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  // تحديد حجم الصفحة بناءً على نوع السند
  let pageSize = 'A4 portrait';
  let pageMargin = '8mm';
  let bodyWidth = '210mm';

  if (elementId.includes('58mm')) {
    pageSize = '58mm auto';
    pageMargin = '0';
    bodyWidth = '58mm';
  } else if (elementId.includes('200x100')) {
    pageSize = '200mm 100mm landscape';
    pageMargin = '3mm';
    bodyWidth = '200mm';
  }

  // جمع أوراق الأنماط من الصفحة الأصلية
  const styleSheets = Array.from(document.styleSheets);
  let cssText = '';
  for (const sheet of styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        cssText += rule.cssText + '\n';
      }
    } catch {
      // CORS stylesheet — skip
    }
  }

  // كتابة محتوى الـ iframe
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${pageSize};
      margin: ${pageMargin};
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      width: ${bodyWidth};
    }
    * { box-sizing: border-box; }
    
    /* منع قص العناصر */
    .voucher-header,
    .voucher-summary,
    .voucher-footer,
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  </style>
</head>
<body>
  ${sourceEl.outerHTML}
</body>
</html>`);
  iframeDoc.close();

  // انتظار تحميل الخطوط والصور ثم الطباعة
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // إزالة الـ iframe بعد الطباعة
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 500);
  };
}

// ─────────────────────────────────────────────────
// 3) إنشاء PDF حقيقي من عنصر السند
// ─────────────────────────────────────────────────
export async function generateVoucherPdf(
  elementId: string,
  logoDataUrl: string | null,
): Promise<Blob | null> {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ]);

  // انتظار الخطوط
  await document.fonts.ready;

  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) throw new Error('لم يتم العثور على عنصر السند');

  // إنشاء نسخة مؤقتة offscreen لالتقاطها
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.id = '';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';

  // حجم العنصر — 194mm لـ A4 (210 - 16mm هوامش)
  let captureWidth = 194; // mm
  let pdfFormat: string | number[] = 'a4';
  let pdfOrientation: 'p' | 'l' = 'p';
  let pdfMarginX = 8; // mm
  let pdfMarginY = 8; // mm

  if (elementId.includes('200x100')) {
    captureWidth = 194; // 200 - 6mm margins
    pdfFormat = [200, 100];
    pdfOrientation = 'l';
    pdfMarginX = 3;
    pdfMarginY = 3;
  } else if (elementId.includes('58mm')) {
    captureWidth = 54; // 58 - 4mm margins
    pdfOrientation = 'p';
    pdfMarginX = 2;
    pdfMarginY = 2;
  }

  // تحويل mm إلى px (96dpi: 1mm ≈ 3.7795px)
  const mmToPx = 3.7795;
  clone.style.width = `${captureWidth}mm`;
  clone.style.maxWidth = `${captureWidth}mm`;
  clone.style.minHeight = 'auto';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';

  // استبدال الشعار بـ dataURL إذا متوفر
  if (logoDataUrl) {
    const imgs = clone.querySelectorAll('img[alt="شعار"]');
    imgs.forEach((img) => {
      (img as HTMLImageElement).src = logoDataUrl;
    });
  }

  document.body.appendChild(clone);

  // انتظار تحميل الصور
  const allImages = clone.querySelectorAll('img');
  await Promise.all(
    Array.from(allImages).map(img =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // لا نوقف بسبب صورة فاشلة
        }
      })
    )
  );

  // تأخير قصير لضمان رسم العناصر
  await new Promise(r => setTimeout(r, 200));

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png', 1.0);

    // حساب حجم الـ PDF
    if (elementId.includes('58mm')) {
      // حساب ارتفاع الورقة الفعلي من نسبة الصورة
      const ratio = canvas.height / canvas.width;
      pdfFormat = [58, Math.ceil(54 * ratio) + (pdfMarginY * 2)];
    }

    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: pdfFormat,
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const contentW = pdfW - (pdfMarginX * 2);
    const ratio = canvas.height / canvas.width;
    const contentH = contentW * ratio;

    if (contentH + (pdfMarginY * 2) <= pdfH) {
      // صفحة واحدة
      pdf.addImage(imgData, 'PNG', pdfMarginX, pdfMarginY, contentW, contentH);
    } else {
      // تعدد الصفحات — A4 فقط واقعياً
      const pageContentH = pdfH - (pdfMarginY * 2);
      let srcY = 0;
      const totalSrcH = canvas.height;
      const srcW = canvas.width;
      const pxPerMm = srcW / contentW;

      let pageNum = 0;
      while (srcY < totalSrcH) {
        if (pageNum > 0) pdf.addPage();
        const sliceH = Math.min(pageContentH * pxPerMm, totalSrcH - srcY);

        // إنشاء canvas مقطعة
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = srcW;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, srcW, sliceH);
          ctx.drawImage(canvas, 0, srcY, srcW, sliceH, 0, 0, srcW, sliceH);
        }
        const pageImg = pageCanvas.toDataURL('image/png', 1.0);
        const sliceHMm = sliceH / pxPerMm;
        pdf.addImage(pageImg, 'PNG', pdfMarginX, pdfMarginY, contentW, sliceHMm);

        srcY += sliceH;
        pageNum++;
      }
    }

    return pdf.output('blob');
  } catch (err) {
    document.body.removeChild(clone);
    throw err;
  }
}
