
// =====================================
// PAWPAL - MY ORDERS
// =====================================

const ordersContainer = document.getElementById("ordersContainer");

let allOrders = [];
let selectedStatus = "all";

const user = JSON.parse(sessionStorage.getItem("pawpalUser") || "null");

// =====================================
// CHECK LOGIN
// =====================================

if (!user || !user.user_id) {
    window.location.href = "login.html";
}

// =====================================
// HELPER FUNCTIONS
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatPrice(amount) {
    const price = Number(amount) || 0;

    return price.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    });
}

function getStatusClass(status) {
    return String(status || "Pending").toLowerCase();
}

// =====================================
// LOAD ORDERS
// =====================================

async function loadOrders() {
    if (!user || !user.user_id || !ordersContainer) return;

    ordersContainer.innerHTML = `
        <p class="orders-loading">🐾 Loading your orders...</p>
    `;

    try {
        const response = await fetch(
            `/api/orders/${encodeURIComponent(user.user_id)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load orders.");
        }

        allOrders = Array.isArray(data.orders) ? data.orders : [];

        displayOrders();

    } catch (error) {
        console.error("Orders loading error:", error);

        ordersContainer.innerHTML = `
            <div class="orders-empty">
                <div style="font-size:40px;">⚠️</div>
                <h3>Unable to load orders</h3>
                <p>${escapeHTML(error.message)}</p>
                <button type="button" onclick="loadOrders()">Try Again</button>
            </div>
        `;
    }
}

// =====================================
// DISPLAY ORDERS
// =====================================

function displayOrders() {
    if (!ordersContainer) return;

    const filteredOrders = selectedStatus === "all"
        ? allOrders
        : allOrders.filter(order => order.order_status === selectedStatus);

    if (filteredOrders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="orders-empty">
                <div style="font-size:55px;">📦</div>
                <h3>No orders found</h3>
                <p>
                    ${selectedStatus === "all"
                        ? "You haven't placed any orders yet. Start shopping for your pet!"
                        : "There are no orders with this status."}
                </p>
                <a href="supplies.html">Explore Pet Supplies →</a>
            </div>
        `;
        return;
    }

    ordersContainer.innerHTML = "";

    filteredOrders.forEach(order => {
        const orderCard = document.createElement("div");
        orderCard.className = "order-card";

        const items = Array.isArray(order.items) ? order.items : [];

        const itemsHTML = items.map(item => {
            const quantity = Math.max(0, Number(item.quantity) || 0);
            const price = Math.max(0, Number(item.price) || 0);

            return `
                <div class="order-item">
                    <div>
                        <strong>${escapeHTML(item.product_name)}</strong>
                        <p>Quantity: ${quantity}</p>
                    </div>
                    <strong>${formatPrice(price * quantity)}</strong>
                </div>
            `;
        }).join("");

        const status = order.order_status || "Pending";

        orderCard.innerHTML = `
            <div class="order-card-header">
                <div>
                    <h3>Order #${escapeHTML(order.order_id)}</h3>
                    <p>📅 Placed on ${formatDate(order.order_date)}</p>
                </div>

                <span class="order-status ${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>
            </div>

            <div class="order-card-body">
                <h3 style="margin-bottom:15px;color:#302d50;">
                    🛍️ Ordered Products
                </h3>

                <div class="order-items">
                    ${itemsHTML || "<p>No product details available.</p>"}
                </div>

                <div class="order-meta">
                    <div>
                        <p>💳 Payment Method</p>
                        <strong>${escapeHTML(order.payment_method || "Not available")}</strong>
                    </div>

                    <div>
                        <p>📍 Delivery Address</p>
                        <strong>${escapeHTML(order.delivery_address || "Not available")}</strong>
                    </div>
                </div>

                <div class="order-total">
                    <span>Total Amount</span>
                    <strong>${formatPrice(order.total_amount)}</strong>
                </div>
            </div>
        `;

        ordersContainer.appendChild(orderCard);
    });
}

// =====================================
// ORDER FILTERS
// =====================================

document.querySelectorAll(".order-filter").forEach(button => {
    button.addEventListener("click", function () {
        document.querySelectorAll(".order-filter").forEach(btn => {
            btn.classList.remove("active");
        });

        this.classList.add("active");

        selectedStatus = this.dataset.status || "all";

        displayOrders();
    });
});

// =====================================
// INITIALIZE
// =====================================

loadOrders();
