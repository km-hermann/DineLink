let products = [];
let editingId = null;

function fetchDataFromDb() {
  fetch(getBackendUrl('/products'))
    .then((response) => {
      if (!response.ok) {
        openErrorPopUp1();
        console.log("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      products = data;
      renderItems();
    })
    .catch((error) => {
      openErrorPopUp2();
      console.error("Fetch error:", error);
    });
}
fetchDataFromDb();

let productList = document.getElementById("productList");
const searchInput = document.getElementById("search");

function renderItems(searchKey = "") {
  productList.innerHTML = "";
  const filteredItems = products.filter((product) => {
    return product.name.toLowerCase().includes(searchKey.toLowerCase());
  });
  
  if (filteredItems.length === 0) {
    productList.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 50px;">
        <img src="./img/empty.png" style="width:120px; opacity:0.5;">
        <p style="color:#888; font-weight:600; margin-top:15px;">No products found</p>
      </div>
    `;
    return;
  }

  for (let product of filteredItems) {
    const div = document.createElement("div");
    div.className = "productItem";
    div.innerHTML = `
      <div class="productInfo">
        <img class="itemImage" src="${product.image}" alt="">
        <div class="detailSection">
          <div class="productName">${product.name}</div>
          <div style="font-size:0.8rem; color:var(--accent); font-weight:700; margin-bottom:5px;">${product.category || 'Main Course'}</div>
          <div class="productDetails">${product.description}</div>
          <div class="state">
            Stock: ${product.stock} | Time: ${product.cookingTime || 15}m | Price: ${product.price}CFA
          </div>
        </div>
      </div>
      <div class="actionButtons">
        <button class="btn btn-edit" onclick="editProduct('${product.id}')">Edit</button>
        <button class="btn btn-delete" onclick="removeItem('${product.id}')">Delete</button>
      </div>
    `;
    productList.appendChild(div);
  }
}

function saveProduct() {
  const name = document.getElementById("nameInput").value.trim();
  const category = document.getElementById("categoryInput").value;
  const cookingTime = document.getElementById("timeInput").value;
  const description = document.getElementById("descInput").value.trim();
  const stock = document.getElementById("stockInput").value.trim();
  const price = document.getElementById("priceInput").value.trim();
  const image = document.getElementById("urlInput").value.trim();

  if (!name || !description || !stock || !price || !image) {
    openPopUp2(); // Validation error popup
    return;
  }

  const productData = {
    name,
    category,
    cookingTime: parseInt(cookingTime) || 15,
    description,
    price: parseFloat(price),
    image,
    stock: parseInt(stock),
  };

  const method = editingId ? "PATCH" : "POST";
  const url = editingId ? getBackendUrl(`/products/${editingId}`) : getBackendUrl('/products');

  fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  })
    .then((response) => {
      if (!response.ok) throw new Error('Save failed');
      return response.json();
    })
    .then(() => {
      fetchDataFromDb();
      closeFormPopup();
      openPopUp(); // Success popup
      if (window.showNotification) showNotification(editingId ? 'Product updated' : 'Product added', 'success');
    })
    .catch((error) => {
      console.error(error);
      openErrorPopUp2();
    });
}

function editProduct(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;

  document.getElementById("nameInput").value = product.name;
  document.getElementById("categoryInput").value = product.category || "Main Course";
  document.getElementById("timeInput").value = product.cookingTime || 15;
  document.getElementById("descInput").value = product.description;
  document.getElementById("stockInput").value = product.stock;
  document.getElementById("priceInput").value = product.price;
  document.getElementById("urlInput").value = product.image;
  
  editingId = id;
  document.getElementById("formTitle").innerHTML = `Edit: ${product.name}`;
  openFormPopup();
}

function emptyForm() {
  document.getElementById("nameInput").value = "";
  document.getElementById("categoryInput").value = "Main Course";
  document.getElementById("timeInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("stockInput").value = "";
  document.getElementById("priceInput").value = "";
  document.getElementById("urlInput").value = "";
}

function removeItem(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  fetch(getBackendUrl(`/products/${id}`), { method: "DELETE" })
    .then((response) => {
      if (!response.ok) throw new Error('Delete failed');
      products = products.filter((p) => String(p.id) !== String(id));
      renderItems();
      if (window.showNotification) showNotification('Product deleted', 'success');
    })
    .catch(err => {
      console.error(err);
      openErrorPopUp2();
    });
}

// Popup Handlers
function openFormPopup() {
  document.getElementById("formPopup").style.display = "block";
  setTimeout(() => {
    document.getElementById("formContent").classList.add("openFormPopup");
  }, 10);
}

function closeFormPopup() {
  document.getElementById("formContent").classList.remove("openFormPopup");
  setTimeout(() => { 
    document.getElementById("formPopup").style.display = "none";
    emptyForm();
    editingId = null;
    document.getElementById("formTitle").innerHTML = "Add New Product";
  }, 300);
}

function openPopUp() {
  document.getElementById("popup").classList.add("show");
  document.getElementById("popupContent").classList.add("openPopup");
}

function closePopUp() {
  document.getElementById("popupContent").classList.remove("openPopup");
  setTimeout(() => document.getElementById("popup").classList.remove("show"), 300);
}

function openPopUp2() {
  document.getElementById("popup2").classList.add("show");
  document.getElementById("popup2Content").classList.add("openPopup");
}

function closePopUp2() {
  document.getElementById("popup2Content").classList.remove("openPopup");
  setTimeout(() => document.getElementById("popup2").classList.remove("show"), 300);
}

function openErrorPopUp1() { 
  document.getElementById("errorPopup1").classList.add("show"); 
  document.getElementById("errorPopup1Content").classList.add("openPopup");
}
function openErrorPopUp2() { 
  document.getElementById("errorPopup2").classList.add("show"); 
  document.getElementById("errorPopup2Content").classList.add("openPopup");
}
function closeErrorPopUp1() {
  document.getElementById("errorPopup1Content").classList.remove("openPopup");
  setTimeout(() => document.getElementById("errorPopup1").classList.remove("show"), 300);
}
function closeErrorPopUp2() {
  document.getElementById("errorPopup2Content").classList.remove("openPopup");
  setTimeout(() => document.getElementById("errorPopup2").classList.remove("show"), 300);
}
