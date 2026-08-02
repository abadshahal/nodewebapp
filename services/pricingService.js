

function calculateCartTotals(cartItems) {
  let subtotal = 0;
  let totalDiscount = 0;

  cartItems.forEach((item) => {
    // original price 
    const itemOriginal = item.price * item.quantity;

    // discount % for variant
    const offerPercent = item.variant?.offerValue || 0;
    const itemDiscount = (itemOriginal * offerPercent) / 100;

    // price after discount 
    const itemFinal = itemOriginal - itemDiscount;
// add each items finals prive
    subtotal += itemFinal;    
    //add each discount here 
    totalDiscount += itemDiscount;
  });

  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax; 

  return { subtotal, discount: totalDiscount, shipping, tax, total };
}

module.exports = { calculateCartTotals };