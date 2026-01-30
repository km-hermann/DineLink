// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin (you might want to implement proper authentication)
    checkAdminAccess();
    
    // Initialize the orders table
    loadOrders();
    
    // Add event listeners for search and filters
    setupEventListeners();
});

function checkAdminAccess() {
    // Implement your admin authentication logic here.
    // Development-friendly fallback: allow access when the URL contains ?admin=1
    // or when the developer enters the correct password in a prompt.
    // NOTE: This is ONLY for development/testing. Replace with real auth in production.

    try {
        const params = new URLSearchParams(window.location.search);
        // URL param override (dev): /dataBase.html?admin=1
        if (params.get('admin') === '1') {
            localStorage.setItem('isAdmin', 'true');
            return;
        }
    } catch (e) {
        // ignore URL parse errors
    }

    // Normal check: must have been set by a login flow
    if (localStorage.getItem('isAdmin')) {
        return;
    }

    // Dev prompt fallback: ask for a password (simple; change or remove for production)
    // Use a very simple default password 'admin' for quick testing.
    const pwd = window.prompt('Admin access required. Enter admin password (development only):');
    if (pwd === 'admin') {
        localStorage.setItem('isAdmin', 'true');
        return;
    }

    // Not authorized -> redirect to home
    window.location.href = 'home.html';
}

async function loadOrders() {
    try {
    const response = await fetch(getBackendUrl('/orders'));
        const orders = await response.json();
        try {
            // only update UI when orders changed
            const ordersHash = JSON.stringify(orders || []);
            if (window._lastOrdersHash !== ordersHash) {
                window._lastOrdersHash = ordersHash;
                displayOrders(orders);
                calculateTotals(orders);
                if (window.showNotification) showNotification('Orders updated', 'info');
            } else {
                // no change
            }
        } catch (e) {
            // fallback: always update
            displayOrders(orders);
            calculateTotals(orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders. Please try again.');
    }
}

function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';

    // Group orders by table ID
    const ordersByTable = {};
    orders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(item => {
            const tableId = item.tableNumber || order.id;
            if (!ordersByTable[tableId]) {
                ordersByTable[tableId] = [];
            }
            ordersByTable[tableId].push({
                orderId: item.orderId,
                name: item.name,
                quantity: item.quantity || item.qty || 1,
                price: item.price || 0,
                orderTime: item.orderTime || order.createdAt || new Date().toISOString()
            });
        });
    });

    // Display orders grouped by table
    Object.entries(ordersByTable).forEach(([tableId, items]) => {
        // Add table header row with colspan
        const headerRow = document.createElement('tr');
        headerRow.className = 'table-group';
        headerRow.innerHTML = `
            <td colspan="6" class="table-header">Table ${tableId}</td>
        `;
        tableBody.appendChild(headerRow);

        // Add items for this table
        items.forEach(item => {
            const time = new Date(item.orderTime);
            const timeStr = time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit'
            });
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td></td>
                <td>${item.orderId}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toLocaleString()}FCFA</td>
                <td>${timeStr}</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

function calculateTotals(orders) {
    let totalAmount = 0;
    orders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(item => {
            totalAmount += (item.price || 0) * (item.quantity || item.qty || 1);
        });
    });
    
    document.getElementById('totalAmount').textContent = `${totalAmount}FCFA`;
}

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
        filterOrders();
    });

    // Date filter
    document.getElementById('startDate').addEventListener('change', filterOrders);
    document.getElementById('endDate').addEventListener('change', filterOrders);
}

// Initialize WebSocket for real-time order updates using the centralized connector
function initWebSocket() {
    connectWebSocket({
        onopen: () => {
            console.log('[WebSocket] Connected to backend for live order updates');
        },
        onmessage: (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'dbchange' || message.type === 'init') {
                    if (message.data && Array.isArray(message.data.orders)) {
                        try {
                            const ordersHash = JSON.stringify(message.data.orders || []);
                            if (window._lastOrdersHash !== ordersHash) {
                                window._lastOrdersHash = ordersHash;
                                console.log('[WebSocket] Orders updated');
                                displayOrders(message.data.orders);
                                calculateTotals(message.data.orders);
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

async function filterOrders() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
    const response = await fetch(getBackendUrl('/orders'));
        let orders = await response.json();

        // Ensure orders is an array
        if (!Array.isArray(orders)) {
            orders = [];
        }

        // Apply filters
        orders = orders.filter(order => {
            if (!order.items || !Array.isArray(order.items)) return false;

            // Check if any item in the order matches the search
            const matchesSearch = order.items.some(item => {
                const searchableFields = [
                    item.name,
                    item.orderId?.toString(),
                    item.tableNumber?.toString(),
                    order.id?.toString()
                ];
                
                return searchableFields.some(field => 
                    field && field.toLowerCase().includes(searchTerm)
                );
            });

            // If no search term, show all
            if (!searchTerm) return true;

            return matchesSearch;
        });

        displayOrders(orders);
        calculateTotals(orders);
    } catch (error) {
        console.error('Error filtering orders:', error);
    }
}

// Function to update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
    const response = await fetch(getBackendUrl(`/orders/${orderId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadOrders(); // Reload the orders to show the update
        } else {
            throw new Error('Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status. Please try again.');
    }
}