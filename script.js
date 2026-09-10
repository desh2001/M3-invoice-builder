const $ = (id) => document.getElementById(id);

const defaultItems = () => ([
  { description: "Website Development", price: 25800, qty: 1 },
  { description: "Domain and Hosting", price: 3700, qty: 1 },
  { description: "SMS Service", price: 500, qty: 1 }
]);

const state = {
  items: defaultItems()
};

function defaultDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).toUpperCase();
}

function numberFormat(value) {
  const n = Number(value) || 0;
  const hasDecimals = Math.abs(n % 1) > 0.00001;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).replaceAll(",", " ");
}

function currencyText(value) {
  const currency = $("currencyInput").value.trim() || "RS.";
  return `${currency} ${numberFormat(value)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getItemPrice(item) {
  return Number(item.price ?? item.amount) || 0;
}

function getItemQty(item) {
  const q = Number(item.qty);
  return isNaN(q) || q <= 0 ? 1 : q;
}

function renderItemEditors() {
  const list = $("itemEditorList");
  list.innerHTML = "";

  state.items.forEach((item, index) => {
    const price = getItemPrice(item);
    const qty = getItemQty(item);
    const lineTotal = price * qty;

    const card = document.createElement("div");
    card.className = "item-editor";
    card.innerHTML = `
      <div class="item-editor-grid">
        <div class="field-group desc-group">
          <label class="item-label">Description</label>
          <input data-index="${index}" data-field="description" type="text" value="${escapeHtml(item.description || "")}" placeholder="Description">
        </div>
        <div class="field-group price-group">
          <label class="item-label">Price</label>
          <input data-index="${index}" data-field="price" type="number" min="0" step="0.01" value="${price}" placeholder="Price">
        </div>
        <div class="field-group qty-group">
          <label class="item-label">Qty</label>
          <input data-index="${index}" data-field="qty" type="number" min="1" step="1" value="${qty}" placeholder="Qty">
        </div>
      </div>
      <div class="item-card-footer">
        <span class="item-total-preview">Total: <b id="itemTotalPreview_${index}">${currencyText(lineTotal)}</b></span>
        <button class="remove-item" data-remove="${index}" type="button">Remove item</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("input[data-index]").forEach(input => {
    input.addEventListener("input", (e) => {
      const index = Number(e.target.dataset.index);
      const field = e.target.dataset.field;
      if (field === "description") {
        state.items[index].description = e.target.value;
      } else if (field === "price") {
        state.items[index].price = Number(e.target.value);
      } else if (field === "qty") {
        state.items[index].qty = Number(e.target.value);
      }
      
      const item = state.items[index];
      const preview = $(`itemTotalPreview_${index}`);
      if (preview) {
        preview.textContent = currencyText(getItemPrice(item) * getItemQty(item));
      }
      renderInvoice();
    });
  });

  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.remove);
      state.items.splice(index, 1);
      renderItemEditors();
      renderInvoice();
    });
  });
}

function renderInvoice() {
  $("invoiceNumber").textContent = $("invoiceNumberInput").value || "—";
  $("invoiceDate").textContent = formatDate($("invoiceDateInput").value);
  $("customerName").textContent = ($("customerNameInput").value || "CUSTOMER NAME").toUpperCase();
  $("customerPhone").textContent = ($("customerPhoneInput").value || "07X XXX XXXX").toUpperCase();
  $("customerWeb").textContent = ($("customerWebInput").value || "CUSTOMER.LK").toUpperCase();

  const rows = $("invoiceRows");
  rows.innerHTML = "";

  state.items.forEach(item => {
    const price = getItemPrice(item);
    const qty = getItemQty(item);
    const lineTotal = price * qty;

    const row = document.createElement("div");
    row.className = "invoice-row";
    row.innerHTML = `
      <div class="desc">${escapeHtml(item.description || "Item")}</div>
      <div class="price">${currencyText(price)}</div>
      <div class="qty">${qty}</div>
      <div class="total">${currencyText(lineTotal)}</div>
    `;
    rows.appendChild(row);
  });

  const subtotal = state.items.reduce((sum, item) => sum + (getItemPrice(item) * getItemQty(item)), 0);
  const taxRate = Number($("taxInput").value) || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  $("subtotalValue").textContent = currencyText(subtotal);
  $("taxValue").textContent = currencyText(tax);
  $("totalValue").textContent = currencyText(total);
}

function bindLiveInputs() {
  [
    "invoiceNumberInput",
    "invoiceDateInput",
    "customerNameInput",
    "customerPhoneInput",
    "customerWebInput",
    "taxInput",
    "currencyInput"
  ].forEach(id => $(id).addEventListener("input", () => {
    renderInvoice();
    state.items.forEach((item, index) => {
      const preview = $(`itemTotalPreview_${index}`);
      if (preview) {
        preview.textContent = currencyText(getItemPrice(item) * getItemQty(item));
      }
    });
  }));
}

$("addItemBtn").addEventListener("click", () => {
  state.items.push({ description: "New Item", price: 0, qty: 1 });
  renderItemEditors();
  renderInvoice();
});

async function generateMasterInvoiceCanvas() {
  const S = 2480 / 794; // 3.1234257
  const width = 2480;
  const height = 3508;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Ensure fonts are ready
  if (document.fonts) {
    try {
      await document.fonts.load('500 40px "Space Grotesk"');
      await document.fonts.load('600 44px "Space Grotesk"');
      await document.fonts.load('700 44px "Space Grotesk"');
      await document.fonts.ready;
    } catch (e) {
      console.warn("Fonts check:", e);
    }
  }

  const previewHasBg = !$("invoice").classList.contains("no-preview-bg");

  // 1. Draw Background
  if (previewHasBg) {
    const img = new Image();
    img.src = window.INVOICE_BG_BASE64 || "assets/invoice-background.png";
    if (img.decode) {
      await img.decode();
    } else {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  const fontFamily = '"Space Grotesk", Arial, sans-serif';

  // 2. Invoice Meta: right: 71px, top: 169px, width: 150px
  const metaRight = (794 - 71) * S;
  const metaTop = 169 * S;
  const metaLineHeight = 21 * S;

  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  // INVOICE #004
  ctx.font = `700 ${Math.round(14 * S)}px ${fontFamily}`;
  ctx.fillStyle = previewHasBg ? "#c8ff1f" : "#111111";
  const invNo = ($("invoiceNumberInput").value || "004").trim();
  ctx.fillText(`INVOICE #${invNo}`, metaRight, metaTop);

  // DATE ISSUED:
  ctx.font = `600 ${Math.round(14 * S)}px ${fontFamily}`;
  ctx.fillStyle = previewHasBg ? "#ffffff" : "#444444";
  ctx.fillText("DATE ISSUED:", metaRight, metaTop + metaLineHeight);

  // Date value
  const dateFormatted = formatDate($("invoiceDateInput").value);
  ctx.fillText(dateFormatted, metaRight, metaTop + (metaLineHeight * 2));

  // 3. Invoice Rows: left: 122px, top: 335px, width: 580px
  const tableLeft = 122 * S;
  const tableTop = 335 * S;
  const tableWidth = 580 * S;
  const rowHeight = 41 * S;

  const col1Width = 214 * S;
  const col2Width = 166 * S;
  const col3Width = 80 * S;
  const col4Width = 120 * S;

  const col1Left = tableLeft;
  const col2Center = tableLeft + col1Width + (col2Width / 2);
  const col3Center = tableLeft + col1Width + col2Width + (col3Width / 2);
  const col4Center = tableLeft + col1Width + col2Width + col3Width + (col4Width / 2);

  ctx.textBaseline = "middle";

  state.items.forEach((item, index) => {
    const rowY = tableTop + (index * rowHeight);
    const rowMidY = rowY + (rowHeight / 2);

    const price = getItemPrice(item);
    const qty = getItemQty(item);
    const lineTotal = price * qty;

    // Item Description (Left aligned)
    ctx.textAlign = "left";
    ctx.font = `500 ${Math.round(13 * S)}px ${fontFamily}`;
    ctx.fillStyle = "#262626";
    const descText = item.description || "Item";
    ctx.fillText(descText, col1Left, rowMidY, col1Width - (12 * S));

    // Price (Center aligned)
    ctx.textAlign = "center";
    ctx.fillText(currencyText(price), col2Center, rowMidY);

    // Qty (Center aligned)
    ctx.fillText(String(qty), col3Center, rowMidY);

    // Total (Center aligned, bold)
    ctx.font = `700 ${Math.round(13 * S)}px ${fontFamily}`;
    ctx.fillText(currencyText(lineTotal), col4Center, rowMidY);

    // Bottom border separator line
    ctx.strokeStyle = "rgba(120, 120, 120, 0.28)";
    ctx.lineWidth = Math.max(1, Math.round(1 * S));
    ctx.beginPath();
    ctx.moveTo(tableLeft, rowY + rowHeight);
    ctx.lineTo(tableLeft + tableWidth, rowY + rowHeight);
    ctx.stroke();
  });

  // 4. Totals Box: right: 130px, top: 553px, height: 35px each
  const totalsRight = (794 - 130) * S;
  const totalsTop = 553 * S;
  const totalsRowHeight = 35 * S;

  const subtotal = state.items.reduce((sum, item) => sum + (getItemPrice(item) * getItemQty(item)), 0);
  const taxRate = Number($("taxInput").value) || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  // Subtotal
  ctx.font = `700 ${Math.round(13 * S)}px ${fontFamily}`;
  ctx.fillStyle = "#303524";
  ctx.fillText(currencyText(subtotal), totalsRight, totalsTop + (totalsRowHeight * 0.5));

  // Tax
  ctx.fillText(currencyText(tax), totalsRight, totalsTop + (totalsRowHeight * 1.5));

  // Total
  ctx.font = `700 ${Math.round(13.5 * S)}px ${fontFamily}`;
  ctx.fillStyle = "#111111";
  ctx.fillText(currencyText(total), totalsRight, totalsTop + (totalsRowHeight * 2.5));

  // 5. Client Box: left: 74px, top: 750px, width: 160px
  const clientLeft = 74 * S;
  const clientTop = 750 * S;
  const clientLineHeight = 12.5 * 1.36 * S;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `500 ${Math.round(12.5 * S)}px ${fontFamily}`;
  ctx.fillStyle = previewHasBg ? "#ffffff" : "#111111";

  const custName = ($("customerNameInput").value || "CUSTOMER NAME").toUpperCase();
  const custPhone = ($("customerPhoneInput").value || "07X XXX XXXX").toUpperCase();
  const custWeb = ($("customerWebInput").value || "CUSTOMER.LK").toUpperCase();

  ctx.fillText(custName, clientLeft, clientTop, 160 * S);
  ctx.fillText(custPhone, clientLeft, clientTop + clientLineHeight, 160 * S);
  ctx.fillText(custWeb, clientLeft, clientTop + (clientLineHeight * 2), 160 * S);

  return canvas;
}

async function downloadPDF() {
  const btn = $("downloadPdfBtn");
  const origHtml = btn ? btn.innerHTML : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px; vertical-align: -2px;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      Generating Ultra HD PDF...
    `;
  }

  try {
    renderInvoice();

    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library is not loaded.");
    }

    const invNo = ($("invoiceNumberInput").value || "004").trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `Invoice_${invNo || "004"}.pdf`;

    // Render directly at master 2480x3508 300 DPI resolution
    const canvas = await generateMasterInvoiceCanvas();

    const quality = $("pdfQualitySelect") ? $("pdfQualitySelect").value : "ultra";
    const imgData = quality === "standard" 
      ? canvas.toDataURL("image/jpeg", 0.95) 
      : canvas.toDataURL("image/png");
    const format = quality === "standard" ? "JPEG" : "PNG";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    // 210 x 297 mm exact A4 page with 300 DPI lossless master data
    pdf.addImage(imgData, format, 0, 0, 210, 297, undefined, "FAST");
    pdf.save(filename);
  } catch (err) {
    console.error("PDF download failed:", err);
    alert("Could not generate PDF: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
}

if ($("downloadPdfBtn")) {
  $("downloadPdfBtn").addEventListener("click", downloadPDF);
}

$("printBtn").addEventListener("click", () => {
  renderInvoice();
  const withBg = $("printBgCheckbox") ? $("printBgCheckbox").checked : false;
  document.body.classList.toggle("print-with-background", withBg);
  window.print();
});

$("previewBgCheckbox").addEventListener("change", (e) => {
  const isChecked = e.target.checked;
  $("invoice").classList.toggle("no-preview-bg", !isChecked);
  if (isChecked && window.INVOICE_BG_BASE64) {
    $("invoice").style.backgroundImage = `url("${window.INVOICE_BG_BASE64}")`;
  }
  if ($("printBgCheckbox")) {
    $("printBgCheckbox").checked = isChecked;
    document.body.classList.toggle("print-with-background", isChecked);
  }
});

$("printBgCheckbox").addEventListener("change", (e) => {
  document.body.classList.toggle("print-with-background", e.target.checked);
});

$("resetBtn").addEventListener("click", () => {
  $("invoiceNumberInput").value = "004";
  $("invoiceDateInput").value = defaultDate();
  $("customerNameInput").value = "";
  $("customerPhoneInput").value = "";
  $("customerWebInput").value = "";
  $("taxInput").value = "0";
  $("currencyInput").value = "RS.";
  if ($("pdfQualitySelect")) $("pdfQualitySelect").value = "ultra";
  $("printBgCheckbox").checked = true;
  $("previewBgCheckbox").checked = true;
  $("invoice").classList.remove("no-preview-bg");
  if (window.INVOICE_BG_BASE64) {
    $("invoice").style.backgroundImage = `url("${window.INVOICE_BG_BASE64}")`;
  }
  document.body.classList.add("print-with-background");
  state.items = defaultItems();
  renderItemEditors();
  renderInvoice();
});

// Initialize background image from base64 if available
if (window.INVOICE_BG_BASE64) {
  $("invoice").style.backgroundImage = `url("${window.INVOICE_BG_BASE64}")`;
}
document.body.classList.add("print-with-background");

$("invoiceDateInput").value = defaultDate();
bindLiveInputs();
renderItemEditors();
renderInvoice();
