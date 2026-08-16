const PDFDocument = require("pdfkit");

const generateInvoicePdf = (order, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", 'application/pdf');

  res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderId}.pdf"`)

  doc.pipe(res)

  doc.fontSize(20).font('Helvetica-Bold').text('Velorian', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text('INVOICE', { align: 'center' });

  doc.moveDown(2);

  doc.fontSize(12).text(`Order ID: ${order.orderId}`);

  doc.text(`Date Placed: ${new Date(order.createdOn).toLocaleDateString()}`);

  doc.text(`Payment Method: ${order.paymentMethod}`);

  doc.moveDown(2);

  doc.fontSize(12).font('Helvetica-Bold').text('Shipping Address:');

  doc.font('Helvetica');

  doc.text(`Name:${order.address.fullName}`)

  doc.text(`${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`);

  doc.text(`country:${order.address.country}`)

  doc.text(`Contact:${order.address.phone}`)

  doc.moveDown(2)

  doc.fontSize(12).font('Helvetica-Bold').text('Items Ordered:');
  doc.font('Helvetica');
  doc.moveDown(0.5)

  for (const item of order.orderedItems) {
    doc.text(`${item.product.name},${item.quantity},${item.price}`)
  }

  doc.moveDown(1)

  doc.text(`SubTotal:Rs.${order.totalPrice}`);

  doc.text(`Tax: Rs:${order.finalAmount - order.totalPrice}`)
  
  doc.text(`Grand Total: Rs.${order.finalAmount}`)

  doc.end()
}

module.exports = { generateInvoicePdf }