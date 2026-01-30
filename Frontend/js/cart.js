let products = [];
function setItemsFromLocalStorage() {
  const storageItems = localStorage.getItem(`cart`);
  if (storageItems) {
    products = JSON.parse(storageItems);
  }
}

// backend host configured in js/config.js; use getBackendUrl('/path')

setItemsFromLocalStorage();

function getTableNumber() {
  let tableNumber = localStorage.getItem("tableNumber");
  if (tableNumber) {
    return tableNumber;
  } else {
    tableNumber = Math.floor(Math.random() * 10000);
    localStorage.setItem("tableNumber", tableNumber);
    return tableNumber;
  }
}

const tableNumber = getTableNumber();

const cartList = document.getElementById("cartContainer");
const cartSummary = document.getElementById("summary");
const cartCount = document.getElementById("cartCount");

function renderItems() {
  cartList.innerHTML = "";
  let totalPrice = 0;
  let totalQty = 0;
  for (let product of products) {
    totalPrice += product.price;
    totalQty += product.qty;
    const div = document.createElement("div");
    div.className = "cartItem";
    div.innerHTML = `
     <div class="itemInfo">
                <img class="itemImage" src="${product.image}" alt="">
                <div class="itemDetails">
                    <div class="itemName">${product.name}</div>
                    <div class="itemQty">
          <button class="reduceBtn qtyBtn" onclick="reduceQuantity('${product.id}')" aria-label="Reduce quantity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <div class="itemDetail qtyValue" data-id="${product.id}">Qty: ${product.qty}</div>
          <button class="addBtn qtyBtn" onclick="addQuantity('${product.id}')" aria-label="Add quantity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
                    </div>
                </div>
            </div>
              <div class="itemPrice">
                <div class="linePrice" data-id="${product.id}">${Math.round(product.price)} CFA</div>
              </div>
            <div class="buttons">
      <button class="removeButton" onclick = "removeCartItem('${product.id}')" ><img src ="./img/trash.png"></button>
            </div>
    `;
    cartList.appendChild(div);
  }
  const emptyCartImage = document.getElementById("emptyCartImage");
  if (totalPrice > 0) {
    if (emptyCartImage) emptyCartImage.style.display = "none";
    cartSummary.style.color = "#4caf50";
    cartSummary.style.fontWeight = "bold";
    cartSummary.textContent = `Total items: ${totalQty}`;
    cartSummary.textContent += ` | Total: ${totalPrice} CFA`;
    document.getElementById("orderButton").style.display = "block";
    document.getElementById("emptyCartButton").style.display = "block";
    cartCount.textContent = `${totalQty}`;
    cartCount.style.display = "block";
  } else {
    if (emptyCartImage) {
      emptyCartImage.style.display = "block";
    }
    cartSummary.textContent = "Empty cart !!";
    cartSummary.style.color = "#888";
    cartCount.style.display = "none";
    document.getElementById("orderButton").style.display = "none";
    document.getElementById("emptyCartButton").style.display = "none";
  }
}
renderItems();

function removeCartItem(productId) {
  const storageItems = localStorage.getItem("cart");
  let items = storageItems ? JSON.parse(storageItems) : [];

  items = items.filter((item) => String(item.id) !== String(productId));

  localStorage.setItem("cart", JSON.stringify(items));
  setItemsFromLocalStorage();
  renderItems();
  // animate the qty value for the changed item
    animateQty(productId);
    // also animate the line total for the changed item
    const priceEl = document.querySelector(`.linePrice[data-id="${productId}"]`);
    if (priceEl) {
      priceEl.classList.remove("price-change");
      // force reflow
      void priceEl.offsetWidth;
      priceEl.classList.add("price-change");
      setTimeout(() => priceEl.classList.remove("price-change"), 500);
    }
}

function addQuantity(productId) {
  const storageItems = localStorage.getItem("cart");
  let items = storageItems ? JSON.parse(storageItems) : [];

  items = items.map((item) => {
    if (String(item.id) === String(productId)) {
      const prevQty = Number(item.qty || 0);
      const prevPrice = Number(item.price || 0);
      const unitPrice = prevQty > 0 ? prevPrice / prevQty : prevPrice || 0;
      const newQty = prevQty + 1;
      item.qty = newQty;
      // store cumulative price for this line (unitPrice * qty)
      item.price = unitPrice * newQty;
    }
    return item;
  });

  localStorage.setItem("cart", JSON.stringify(items));
  setItemsFromLocalStorage();
  renderItems();
  // animate the qty value for the changed item
    animateQty(productId);
    // also animate the line total for the changed item
    const priceEl = document.querySelector(`.linePrice[data-id="${productId}"]`);
    if (priceEl) {
      priceEl.classList.remove("price-change");
      // force reflow
      void priceEl.offsetWidth;
      priceEl.classList.add("price-change");
      setTimeout(() => priceEl.classList.remove("price-change"), 500);
    }
}

// animate quantity element briefly when qty changes
function animateQty(productId) {
  try {
    const el = document.querySelector(`.qtyValue[data-id="${productId}"]`);
    if (!el) return;
    el.classList.remove("qty-change");
    // force reflow so re-adding the class restarts animation reliably
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth;
    el.classList.add("qty-change");
    setTimeout(() => el.classList.remove("qty-change"), 400);
  } catch (e) {
    // no-op if DOM not present
  }
}

function reduceQuantity(productId) {
  const storageItems = localStorage.getItem("cart");
  let items = storageItems ? JSON.parse(storageItems) : [];

  items = items
    .map((item) => {
      if (String(item.id) === String(productId)) {
        const prevQty = Number(item.qty || 1);
        const prevPrice = Number(item.price || 0);
        const unitPrice = prevQty > 0 ? prevPrice / prevQty : prevPrice || 0;
        const newQty = Math.max(0, prevQty - 1);
        item.qty = newQty;
        item.price = unitPrice * newQty;
      }
      return item;
    })
    .filter((item) => (item.qty || 0) > 0);

  localStorage.setItem("cart", JSON.stringify(items));
  setItemsFromLocalStorage();
  renderItems();
  // animate the qty and the line total for the changed item (if still present)
  animateQty(productId);
  const priceEl = document.querySelector(`.linePrice[data-id="${productId}"]`);
  if (priceEl) {
    priceEl.classList.remove("price-change");
    void priceEl.offsetWidth;
    priceEl.classList.add("price-change");
    setTimeout(() => priceEl.classList.remove("price-change"), 500);
  }
}

function addToOrder() {
  const cartItems = localStorage.getItem(`cart`);
  if (!cartItems) return;
  
  let items = JSON.parse(cartItems);
  const orderTimestamp = new Date().toISOString();

  // 1. Prepare Order Payload
  for (const item of items) {
    Object.assign(item, {
      orderId: Math.floor(Math.random() * 1000000),
      status: "pending",
      tableNumber: tableNumber,
      orderTime: orderTimestamp
    });
  }

  const orderPayLoad = {
    id: tableNumber,
    items: items,
  };

  // 2. Post Order & Update Stocks
  fetch(getBackendUrl('/orders'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayLoad),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Order failed");

      // 3. Stock Reduction Logic
      for (const item of items) {
        // Fetch current product to get latest stock
        const pResp = await fetch(getBackendUrl(`/products/${item.id}`));
        if (pResp.ok) {
          const currentProd = await pResp.json();
          const newStock = Math.max(0, currentProd.stock - item.qty);
          
          // Update stock on backend
          await fetch(getBackendUrl(`/products/${item.id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stock: newStock }),
          });
        }
      }

      localStorage.removeItem(`cart`);
      products = [];
      renderItems();
      openPopUp2();
      if (window.showNotification) showNotification('Order placed & stock updated', 'success');
    })
    .catch((error) => {
      console.error(error);
      alert("Order could not be processed.");
    });
}

function emptyCart() {
  localStorage.removeItem(`cart`);
  products = [];
  renderItems();
  openPopUp4();
}

let popUp = document.getElementById("popup");
let popUpContent = document.getElementById("popupContent");
let popUp2 = document.getElementById("popup2");
let popUpContent2 = document.getElementById("popup2Content");
let popUp3 = document.getElementById("popup3");
let popUpContent3 = document.getElementById("popup3Content");
let popUp4 = document.getElementById("popup4");
let popUpContent4 = document.getElementById("popup4Content");
let popUpSummary = document.getElementById("orderSummary");
let popUpTotal = document.getElementById("totalAmount");
let popUp3Summary = document.getElementById("orderSummary3");
let popUp3Total = document.getElementById("totalAmount3");

function openPopUp() {
  if (popUp) {
    popUp.classList.add("show");
    popUpContent.classList.add("openPopup");
    let totalPrice = 0;
    let totalQty = 0;
    for (let product of products) {
      totalPrice += product.price;
      totalQty += product.qty;
    }
    popUpSummary.textContent = `Total items: ${totalQty}`;
    popUpTotal.textContent = `Total: ${totalPrice} CFA`;
  }
}

function openPopUp2() {
  if (popUp2) {
    popUp2.classList.add("show");
    popUpContent2.classList.add("openPopup");
    closePopUp();
  }
}

function closePopUp() {
  if (popUpContent) {
    popUpContent.classList.remove("openPopup");
    setTimeout(() => popUp.classList.remove("show"), 300);
  }
}

function closePopUp2() {
  if (popUpContent2) {
    popUpContent2.classList.remove("openPopup");
    setTimeout(() => popUp2.classList.remove("show"), 300);
  }
}

function openPopUp3() {
  if (popUp3) {
    popUp3.classList.add("show");
    popUpContent3.classList.add("openPopup");
    let totalPrice = 0;
    let totalQty = 0;
    for (let product of products) {
      totalPrice += product.price;
      totalQty += product.qty;
    }
    popUp3Summary.textContent = `Total items: ${totalQty}`;
    popUp3Total.textContent = `Total: ${totalPrice} CFA`;
  }
}

function openPopUp4() {
  if (popUp4) {
    popUp4.classList.add("show");
    popUpContent4.classList.add("openPopup");
    closePopUp3()
    // Don't closePopUp3 here, close it explicitly before calling openPopUp4
  }
}

function closePopUp3() {
  if (popUpContent3) {
    popUpContent3.classList.remove("openPopup");
      popUp3.classList.remove("show");
  }
}

function closePopUp4() {
  if (popUpContent4) {
    popUpContent4.classList.remove("openPopup");
    setTimeout(() => popUp4.classList.remove("show"), 300);
  }
}
