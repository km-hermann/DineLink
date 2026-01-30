let products = [];
let currentCategory = "All";
let lastProductsHash = null;

const pageSize = 20;
let currentPage = 1;
let loadMoreBtn = null;

function fetchDataFromDb() {
  fetch(getBackendUrl('/products'))
    .then((response) => {
      if (!response.ok) openErrorPopUp1();
      return response.json();
    })
    .then((data) => {
      products = data;
      renderFoods();
    })
    .catch((error) => {
      openErrorPopUp2();
      console.error(error);
    });
}
fetchDataFromDb();

// WebSocket for real-time stock and product updates
function initWebSocket() {
  const ws = connectWebSocket({
    onmessage: (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'dbchange' || message.type === 'init') {
          fetchDataFromDb(); // Robust refresh on any change
        }
      } catch (err) { console.error(err); }
    }
  });
}
initWebSocket();

function scrollToMenu() {
  document.getElementById('menu-anchor').scrollIntoView({ behavior: 'smooth' });
}

function filterCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const btnText = btn.textContent.trim();
    // Special handling for labels vs values if needed, but here simple match
    const isMatch = (category === 'All' && btnText === 'All') || 
                    (category === 'Main Course' && btnText === 'Main Courses') ||
                    (btnText === category);
    btn.classList.toggle('active', isMatch);
  });
  renderFoods(searchInput.value);
}

const foodList = document.getElementById("foodList");
const searchInput = document.getElementById("search");

function createFoodElement(product) {
  const isOutOfStock = product.stock <= 0;
  const div = document.createElement("div");
  div.className = "foodItem";
  div.dataset.id = product.id;
  div.dataset.category = product.category || "Main Course";

  div.innerHTML = `
    <img class="foodImage" src="${product.image}" alt="${product.name}" loading="lazy">
    <div class="foodTitle">${product.name}</div>
    <div class="meta-info">
      <div class="cooking-time">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${product.cookingTime || '15'} mins
      </div>
      <div class="stock-badge ${product.stock < 5 ? 'low' : ''}">
        ${isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock}`}
      </div>
    </div>
    <div class="foodDescription">${product.description}</div>
    <div class="price">${product.price} CFA</div>
    <button class="addButton" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${product.id}')">
      ${isOutOfStock ? 'Not Available' : 'Add to Cart'}
    </button>
  `;
  return div;
}

function renderFoods(searchKey = "") {
  foodList.innerHTML = "";
  
  const filteredItems = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchKey.toLowerCase());
    const matchesCategory = currentCategory === "All" || product.category === currentCategory;
    return matchesSearch && matchesCategory;
  });

  const fragment = document.createDocumentFragment();
  filteredItems.forEach(product => {
    fragment.appendChild(createFoodElement(product));
  });

  foodList.appendChild(fragment);
}

searchInput.addEventListener("input", (e) => {
  renderFoods(e.target.value);
});

// Original Cart logic remains intact but optimized
function addToCart(productId) {
  const product = products.find((p) => String(p.id) === String(productId));
  if (!product || product.stock <= 0) return;

  const storageItems = localStorage.getItem(`cart`);
  let items = storageItems ? JSON.parse(storageItems) : [];
  
  const existingIndex = items.findIndex((item) => String(item.id) === String(productId));
  
  if (existingIndex !== -1) {
    items[existingIndex].qty += 1;
    items[existingIndex].price = product.price * items[existingIndex].qty;
  } else {
    items.push({ ...product, qty: 1 });
  }
  
  localStorage.setItem(`cart`, JSON.stringify(items));
  updateCartCountDisplay();
  showAddToCartNotification(product.name);
}

function updateCartCountDisplay() {
  const cartCount = document.getElementById("cartCount");
  if (!cartCount) return;
  const storageItems = localStorage.getItem("cart");
  if (storageItems) {
    const items = JSON.parse(storageItems);
    const count = items.reduce((acc, item) => acc + item.qty, 0);
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? "flex" : "none";
  } else {
    cartCount.style.display = "none";
  }
}
updateCartCountDisplay();

// Popup and Notify helpers...
function showAddToCartNotification(productName) {
  if (window.showNotification) {
    showNotification(`${productName} added to cart`, 'success');
  }
}

let popup1 = document.getElementById("errorPopup1");
let popup2 = document.getElementById("errorPopup2");
let popup1Content = document.getElementById("popup1Content");
let popup2Content = document.getElementById("popup2Content");

function openErrorPopUp1() { if (popup1) { popup1.classList.add("show"); popup1Content.classList.add("openPopup"); } }
function openErrorPopUp2() { if (popup2) { popup2.classList.add("show"); popup2Content.classList.add("openPopup"); } }
function closeErrorPopUp1() { if (popup1) { popup1Content.classList.remove("openPopup"); setTimeout(() => popup1.classList.remove("show"), 300); } }
function closeErrorPopUp2() { if (popup2) { popup2Content.classList.remove("openPopup"); setTimeout(() => popup2.classList.remove("show"), 300); } }