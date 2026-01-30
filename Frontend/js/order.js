let products = [];
// incremental render / pagination settings
const pageSizeOrders = 50;
let ordersPage = 1;
const renderedNodes = new Map(); // id -> DOM node
let loadMoreOrdersBtn = null;

// backend host is configured in js/config.js
let lastOrdersHash = null; // used to detect backend changes

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

const tableNumber = getTableNumber()

function fetchDataFromDb() {
  fetch(getBackendUrl(`/orders/${tableNumber}`))
    .then((response) => {
      console.log(response);
      if (!response.ok) {
        openErrorPopUp1();
        console.log("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      const items = data.items || [];
      try {
        const newHash = JSON.stringify(items);
        if (newHash !== lastOrdersHash) {
          lastOrdersHash = newHash;
          products = items;
          renderItems();
        } else {
          // no change
        }
      } catch (e) {
        // fallback: always render if serialization fails
        products = items;
        renderItems();
      }
    })
    .catch((error) => {
      openErrorPopUp2();
      console.log("There has been a problem with your fetch operation:", error);
    });
}
fetchDataFromDb();

// Initialize WebSocket for real-time order updates
function initWebSocket() {
  const ws = connectWebSocket({
    onopen: () => {
      console.log('[WebSocket] Connected to backend for live order updates');
    },
    onmessage: (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'dbchange' || message.type === 'init') {
        if (message.data && Array.isArray(message.data.orders)) {
          // Find orders for this table
          const tableOrders = message.data.orders.find(o => String(o.id) === String(tableNumber));
          if (tableOrders) {
            try {
              const newHash = JSON.stringify(tableOrders.items || []);
              if (newHash !== lastOrdersHash) {
                lastOrdersHash = newHash;
                products = tableOrders.items || [];
                console.log('[WebSocket] Your orders updated');
                renderItems();
                if (window.showNotification) showNotification('Your orders updated', 'info');
              }
            } catch (e) {
              console.error('[WebSocket] Error processing orders:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('[WebSocket] Message parsing error:', err);
    }
    },
    onerror: (err) => {
      console.error('[WebSocket] Connection error:', err);
    },
    onclose: () => {
      console.log('[WebSocket] Disconnected. Attempting reconnect in 3s...');
      setTimeout(initWebSocket, 3000);
    }
  });
}

initWebSocket();

const ordertList = document.getElementById("orderContainer");
const orderSummary = document.getElementById("summary");

function ensureLoadMoreOrdersButton() {
  if (!loadMoreOrdersBtn) {
    loadMoreOrdersBtn = document.createElement("button");
    loadMoreOrdersBtn.className = "loadMoreButton";
    loadMoreOrdersBtn.textContent = "Load more orders";
    loadMoreOrdersBtn.addEventListener("click", () => {
      ordersPage += 1;
      renderItems();
    });
    ordertList.insertAdjacentElement("afterend", loadMoreOrdersBtn);
  }
}

function createOrderElement(product) {
  const div = document.createElement("div");
  div.className = "orderItem";
  div.dataset.id = product.id;

  const itemInfo = document.createElement("div");
  itemInfo.className = "itemInfo";

  const img = document.createElement("img");
  img.className = "itemImage";
  img.src = product.image;
  img.alt = product.name || "";
  img.loading = "lazy";

  const itemDetails = document.createElement("div");
  itemDetails.className = "itemDetails";

  const itemName = document.createElement("div");
  itemName.className = "itemName";
  itemName.textContent = product.name;

  const itemDetail = document.createElement("div");
  itemDetail.className = "itemDetail";
  itemDetail.textContent = `Qty: ${product.qty}`;

  itemDetails.appendChild(itemName);
  itemDetails.appendChild(itemDetail);
  itemInfo.appendChild(img);
  itemInfo.appendChild(itemDetails);

  const itemPrice = document.createElement("div");
  itemPrice.className = "itemPrice";
  itemPrice.textContent = `${product.price}CFA`;

  const btn = document.createElement("button");
  btn.className = `statusButton ${product.status || ""}`;
  const btnImg = document.createElement("img");
  btnImg.src = `./img/${product.status || "pending"}.png`;
  btn.appendChild(btnImg);

  div.appendChild(itemInfo);
  div.appendChild(itemPrice);
  div.appendChild(btn);

  return div;
}

function renderItems() {
  if (products.length === 0) {
    ordertList.innerHTML = `
      <div class="no-orders" style="text-align:center; padding: 50px 20px;">
        <img src="./img/empty.png" style="width:150px; opacity:0.6; margin-bottom:20px;">
        <p style="font-size:1.2rem; color:#888; font-weight:600;">No order placed yet!!</p>
      </div>
    `;
    if (orderSummary) orderSummary.textContent = "";
    return;
  }

  // If we were showing the "no orders" message, we need to clear it first
  if (ordertList.querySelector('.no-orders')) {
    ordertList.innerHTML = "";
    renderedNodes.clear();
  }

  // determine which items to show
  const maxItems = ordersPage * pageSizeOrders;
  const itemsToShow = products.slice(0, maxItems);
  const idsToShow = new Set(itemsToShow.map((p) => `${p.id}`));

  // update or create nodes for itemsToShow
  for (const product of itemsToShow) {
    const id = `${product.id}`;
    if (renderedNodes.has(id)) {
      // update existing node
      const node = renderedNodes.get(id);
      const img = node.querySelector(".itemImage");
      const name = node.querySelector(".itemName");
      const qty = node.querySelector(".itemDetail");
      const price = node.querySelector(".itemPrice");
      const statusBtn = node.querySelector(".statusButton");
      const statusImg = statusBtn && statusBtn.querySelector("img");
      if (img && img.src !== product.image) img.src = product.image;
      if (name) name.textContent = product.name;
      if (qty) qty.textContent = `Qty: ${product.qty}`;
      if (price) price.textContent = `${product.price}CFA`;
      if (statusBtn) {
        statusBtn.className = `statusButton ${product.status || ""}`;
        if (statusImg) statusImg.src = `./img/${product.status || "pending"}.png`;
      }
    } else {
      const newNode = createOrderElement(product);
      ordertList.appendChild(newNode);
      renderedNodes.set(id, newNode);
    }
  }

  // remove nodes that are no longer in the slice
  for (const [id, node] of Array.from(renderedNodes.entries())) {
    if (!idsToShow.has(id)) {
      node.remove();
      renderedNodes.delete(id);
    }
  }

  // toggle load more button
  if (products.length > maxItems) {
    ensureLoadMoreOrdersButton();
    loadMoreOrdersBtn.style.display = "inline-block";
  } else if (loadMoreOrdersBtn) {
    loadMoreOrdersBtn.style.display = "none";
  }
}

// initial render (if products loaded synchronously)
renderItems();

// Show cart count if there are items in localStorage on page load
(function showCartCountOnLoad() {
  const cartCount = document.getElementById("cartCount");
  if (!cartCount) return;
  const storageItems = localStorage.getItem("cart");
  if (storageItems) {
    const items = JSON.parse(storageItems);
    const cartCountValue = items.reduce((acc, item) => acc + item.qty, 0);
    if (cartCountValue > 0) {
      cartCount.textContent = `${cartCountValue}`;
      cartCount.style.display = "flex";
    } else {
      cartCount.style.display = "none";
    }
  } else {
    cartCount.style.display = "none";
  }
})();

/**
 * Global helpers for popups
 */
let popup1 = document.getElementById("errorPopup1");
let popup2 = document.getElementById("errorPopup2");
let popup1Content = document.getElementById("popup1Content");
let popup2Content = document.getElementById("popup2Content");

function openErrorPopUp1() {
  if (popup1) {
    popup1.classList.add("show");
    document.getElementById("errorPopup1Content").classList.add("openPopup");
  }
}

function openErrorPopUp2() {
  if (popup2) {
    popup2.classList.add("show");
    document.getElementById("errorPopup2Content").classList.add("openPopup");
  }
}

function closeErrorPopUp1() {
  if (popup1) {
    document.getElementById("errorPopup1Content").classList.remove("openPopup");
    setTimeout(() => popup1.classList.remove("show"), 300);
  }
}

function closeErrorPopUp2() {
  if (popup2) {
    document.getElementById("errorPopup2Content").classList.remove("openPopup");
    setTimeout(() => popup2.classList.remove("show"), 300);
  }
}