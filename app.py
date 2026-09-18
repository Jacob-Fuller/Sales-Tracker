"""
Sales Tracker - a simple local web app for tracking products, sales,
customers, and expenses.

Run with:  python3 app.py
Then open: http://127.0.0.1:5000 in your browser.
"""

import sqlite3
from collections import OrderedDict
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, g

app = Flask(__name__)
DATABASE = "sales_tracker.db"

SALE_SOURCES = [
    "In Person",
    "Facebook Marketplace",
    "Online Store",
    "Phone Order",
    "Other",
]

EXPENSE_CATEGORIES = [
    "Inventory",
    "Supplies",
    "Software",
    "Shipping",
    "Marketing",
    "Other",
]


# ---------- Database helpers ----------

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT
            );

            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                customer_id INTEGER,
                quantity INTEGER NOT NULL,
                discount_percent REAL NOT NULL DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'In Person',
                sale_date TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                vendor TEXT,
                category TEXT NOT NULL DEFAULT 'Other',
                amount REAL NOT NULL,
                expense_date TEXT NOT NULL
            );
            """
        )
        db.commit()


def month_key(date_str):
    # date_str is "YYYY-MM-DD" -> ("YYYY-MM", "Month YYYY")
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%Y-%m"), dt.strftime("%B %Y")


def group_by_month(rows, date_field):
    """Group rows (sqlite3.Row) into an OrderedDict keyed by 'Month YYYY',
    newest month first, each value a dict with 'items' and 'total'."""
    buckets = OrderedDict()
    sortable = sorted(rows, key=lambda r: r[date_field], reverse=True)
    for r in sortable:
        _, label = month_key(r[date_field])
        if label not in buckets:
            buckets[label] = {"rows": [], "total": 0.0}
        buckets[label]["rows"].append(r)
    return buckets


# ---------- Dashboard ----------

@app.route("/")
def dashboard():
    db = get_db()

    sales = db.execute(
        """
        SELECT sales.id, products.name AS product_name, products.price,
               sales.quantity, sales.discount_percent, sales.sale_date,
               sales.source, customers.name AS customer_name,
               (products.price * sales.quantity) * (1 - sales.discount_percent / 100.0) AS total
        FROM sales
        JOIN products ON products.id = sales.product_id
        LEFT JOIN customers ON customers.id = sales.customer_id
        ORDER BY sales.sale_date DESC, sales.id DESC
        """
    ).fetchall()

    expenses = db.execute(
        "SELECT * FROM expenses ORDER BY expense_date DESC"
    ).fetchall()

    total_revenue = sum(s["total"] for s in sales)
    total_units = sum(s["quantity"] for s in sales)
    total_expenses = sum(e["amount"] for e in expenses)
    net = total_revenue - total_expenses

    products = db.execute("SELECT * FROM products ORDER BY name").fetchall()
    customers = db.execute("SELECT * FROM customers ORDER BY name").fetchall()

    # Sales trend by month (for the bar chart), oldest -> newest, last 6 months of data present
    trend = OrderedDict()
    for s in sorted(sales, key=lambda r: r["sale_date"]):
        key, label = month_key(s["sale_date"])
        trend.setdefault((key, label), 0.0)
        trend[(key, label)] += s["total"]
    trend_items = list(trend.items())[-6:]
    max_trend_value = max([v for _, v in trend_items], default=0) or 1

    # Top products by revenue
    product_totals = {}
    for s in sales:
        product_totals[s["product_name"]] = product_totals.get(s["product_name"], 0) + s["total"]
    top_products = sorted(product_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    # Top customers by revenue
    customer_totals = {}
    for s in sales:
        cname = s["customer_name"] or "Unknown Customer"
        customer_totals[cname] = customer_totals.get(cname, 0) + s["total"]
    top_customers = sorted(customer_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    return render_template(
        "dashboard.html",
        active="home",
        total_revenue=total_revenue,
        total_units=total_units,
        total_expenses=total_expenses,
        net=net,
        products=products,
        customers=customers,
        trend_items=trend_items,
        max_trend_value=max_trend_value,
        top_products=top_products,
        top_customers=top_customers,
    )


# ---------- Products ----------

@app.route("/products")
def list_products():
    db = get_db()
    products = db.execute(
        """
        SELECT products.*,
               (SELECT COUNT(*) FROM sales WHERE sales.product_id = products.id) AS sale_count
        FROM products ORDER BY name
        """
    ).fetchall()
    return render_template("products.html", products=products, active="products")


@app.route("/products/add", methods=["GET", "POST"])
def add_product():
    if request.method == "POST":
        name = request.form["name"].strip()
        price = float(request.form["price"])
        db = get_db()
        db.execute("INSERT INTO products (name, price) VALUES (?, ?)", (name, price))
        db.commit()
        return redirect(url_for("list_products"))
    return render_template("add_product.html", active="products")


@app.route("/products/<int:product_id>/delete", methods=["POST"])
def delete_product(product_id):
    db = get_db()
    sale_count = db.execute(
        "SELECT COUNT(*) AS c FROM sales WHERE product_id = ?", (product_id,)
    ).fetchone()["c"]
    if sale_count == 0:
        db.execute("DELETE FROM products WHERE id = ?", (product_id,))
        db.commit()
    # If it has sales, we silently skip deleting to avoid breaking sale history.
    return redirect(url_for("list_products"))


# ---------- Customers ----------

@app.route("/customers")
def list_customers():
    db = get_db()
    customers = db.execute(
        """
        SELECT customers.*,
               (SELECT COUNT(*) FROM sales WHERE sales.customer_id = customers.id) AS sale_count
        FROM customers ORDER BY name
        """
    ).fetchall()
    return render_template("customers.html", customers=customers, active="customers")


@app.route("/customers/add", methods=["GET", "POST"])
def add_customer():
    if request.method == "POST":
        name = request.form["name"].strip()
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        db = get_db()
        db.execute(
            "INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)",
            (name, email, phone),
        )
        db.commit()
        return redirect(url_for("list_customers"))
    return render_template("add_customer.html", active="customers")


@app.route("/customers/<int:customer_id>/delete", methods=["POST"])
def delete_customer(customer_id):
    db = get_db()
    # Keep their past sales, just unlink the customer from them.
    db.execute("UPDATE sales SET customer_id = NULL WHERE customer_id = ?", (customer_id,))
    db.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    db.commit()
    return redirect(url_for("list_customers"))


# ---------- Sales ----------

@app.route("/sales")
def list_sales():
    db = get_db()
    sales = db.execute(
        """
        SELECT sales.id, products.name AS product_name, sales.quantity,
               sales.discount_percent, sales.sale_date, sales.source,
               customers.name AS customer_name,
               (products.price * sales.quantity) * (1 - sales.discount_percent / 100.0) AS total
        FROM sales
        JOIN products ON products.id = sales.product_id
        LEFT JOIN customers ON customers.id = sales.customer_id
        ORDER BY sales.sale_date DESC, sales.id DESC
        """
    ).fetchall()

    grouped = group_by_month(sales, "sale_date")
    for label, bucket in grouped.items():
        bucket["total"] = sum(item["total"] for item in bucket["rows"])

    return render_template("sales.html", grouped=grouped, active="sales")


@app.route("/sales/add", methods=["GET", "POST"])
def add_sale():
    db = get_db()
    if request.method == "POST":
        product_id = int(request.form["product_id"])
        customer_id = request.form.get("customer_id") or None
        quantity = int(request.form["quantity"])
        discount_percent = float(request.form.get("discount_percent") or 0)
        source = request.form.get("source") or "In Person"
        sale_date = request.form.get("sale_date") or datetime.now().strftime("%Y-%m-%d")

        db.execute(
            """
            INSERT INTO sales (product_id, customer_id, quantity, discount_percent, source, sale_date)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (product_id, customer_id, quantity, discount_percent, source, sale_date),
        )
        db.commit()
        return redirect(url_for("list_sales"))

    products = db.execute("SELECT * FROM products ORDER BY name").fetchall()
    customers = db.execute("SELECT * FROM customers ORDER BY name").fetchall()
    today = datetime.now().strftime("%Y-%m-%d")
    return render_template(
        "add_sale.html",
        active="sales",
        products=products,
        customers=customers,
        sources=SALE_SOURCES,
        today=today,
    )


@app.route("/sales/<int:sale_id>/delete", methods=["POST"])
def delete_sale(sale_id):
    db = get_db()
    db.execute("DELETE FROM sales WHERE id = ?", (sale_id,))
    db.commit()
    return redirect(url_for("list_sales"))


# ---------- Expenses ----------

@app.route("/expenses")
def list_expenses():
    db = get_db()
    expenses = db.execute(
        "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
    ).fetchall()

    grouped = group_by_month(expenses, "expense_date")
    for label, bucket in grouped.items():
        bucket["total"] = sum(item["amount"] for item in bucket["rows"])

    return render_template("expenses.html", grouped=grouped, categories=EXPENSE_CATEGORIES, active="expenses")


@app.route("/expenses/add", methods=["GET", "POST"])
def add_expense():
    if request.method == "POST":
        description = request.form["description"].strip()
        vendor = request.form.get("vendor", "").strip()
        category = request.form.get("category") or "Other"
        amount = float(request.form["amount"])
        expense_date = request.form.get("expense_date") or datetime.now().strftime("%Y-%m-%d")

        db = get_db()
        db.execute(
            """
            INSERT INTO expenses (description, vendor, category, amount, expense_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (description, vendor, category, amount, expense_date),
        )
        db.commit()
        return redirect(url_for("list_expenses"))

    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_expense.html", categories=EXPENSE_CATEGORIES, today=today, active="expenses")


@app.route("/expenses/<int:expense_id>/delete", methods=["POST"])
def delete_expense(expense_id):
    db = get_db()
    db.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    db.commit()
    return redirect(url_for("list_expenses"))


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
