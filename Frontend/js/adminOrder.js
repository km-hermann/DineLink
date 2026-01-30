let products = [];

// backend host configured in js/config.js
let lastOrdersHash = null; // detect changes on backend

function fetchDataFromDb() {
  fetch(getBackendUrl('/orders'))
    .then((response) => {
      console.log(response);
      if (!response.ok) {
        openErrorPopUp1();
        console.log("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      try {
        const newHash = JSON.stringify(data || []);
        if (newHash !== lastOrdersHash) {
          lastOrdersHash = newHash;
          products = data;
          console.log('Orders changed - updating UI');
          renderItems();
        } else {
          // no change
        }
      } catch (e) {
        // fallback: update always
        products = data;
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
          try {
            const newHash = JSON.stringify(message.data.orders);
            if (newHash !== lastOrdersHash) {
              lastOrdersHash = newHash;
              products = message.data.orders;
              console.log('[WebSocket] Orders updated');
              renderItems();
              if (window.showNotification) showNotification('Orders updated', 'info');
            }
          } catch (e) {
            console.error('[WebSocket] Error processing orders:', e);
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
function renderItems() {
  ordertList.innerHTML = "";
  
  if (products.length === 0) {
    ordertList.innerHTML = `
      <div class="no-orders" style="text-align:center; padding: 50px 20px; grid-column: span 2;">
        <img src="./img/empty.png" style="width:150px; opacity:0.6; margin-bottom:20px;">
        <p style="font-size:1.5rem; color:#888; font-weight:800;">No orders yet!!</p>
      </div>
    `;
    return;
  }

  for (const order of products) {
    const tableSection = document.createElement("div");
    tableSection.className = "tableSection";
    
    const tableHeader = document.createElement("h3");
    tableHeader.className = "tableHeader";
    tableHeader.textContent = `Table No: ${order.id}`;
    tableSection.appendChild(tableHeader);

    const itemsGrid = document.createElement("div");
    itemsGrid.className = "itemsGrid";

    for (let product of order.items) {
      const div = document.createElement("div");
      div.className = "orderItem";
      div.innerHTML = `
     <div class="itemInfo">
                <img class="itemImage" src="${product.image}" alt="">
                <div class="itemDetails">
                    <div class="itemName">${product.name}</div>
                    <div class="itemDetail">Qty: ${product.qty}</div>
                </div>
            </div>
            <div class="itemPrice">${product.price}CFA</div>
            <button class="statusButton ${product.status}" onclick = "changeProductStatus('${product.orderId}')" >${product.status}</button>
    `;
      itemsGrid.appendChild(div);
    }
    tableSection.appendChild(itemsGrid);
    ordertList.appendChild(tableSection);
  }
}
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

async function changeProductStatus(orderId) {
  try {
    // Find the order that contains the product with productId
    const order = products.find((order) =>
      order.items.some((item) => (item.orderId.toString() === orderId.toString()))
    );
    if (!order) {
      console.error("Order containing product not found");
      return;
    }

    // Find the product inside the order's items
    const updatedItems = order.items.map((item) => {
      if (item.orderId.toString() === orderId.toString()) {
        return {
          ...item,
          status: getStatus(item.status),
        };
      }
      return item;
    });

    const updatedOrder = {
      ...order,
      items: updatedItems,
    };

    // Send PUT request to update the whole order on the server
  const response = await fetch(getBackendUrl(`/orders/${order.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedOrder),
    });

    if (!response.ok) throw new Error("Failed to update order on server");

    // Update local products array
    products = products.map((o) => (o.id === order.id ? updatedOrder : o));

    // Re-render UI
    renderItems();
  } catch (error) {
    console.error("Error updating product status:", error);
  }
}

function getStatus(status) {
  if (status === "pending") {
    return "cooking";
  } else if (status === "cooking") {
    return "delivered";
  } else {
    return status;
  }
}

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