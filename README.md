# Sales Tracker

A local sales tracking app: manage products, customers, sales, and expenses,
with a dashboard showing revenue, net profit, sales trends, and top performers.

⚠️ If you have an older copy of this app already, delete its
`sales_tracker.db` file before running this version once — the database
structure changed to support customers and expenses, and old files aren't
compatible. You'll lose old test data, but nothing important, since this is
a fresh build.

## What you need (free)

1. **Python** — https://www.python.org/downloads/
   - When installing on Windows, tick the box that says "Add Python to PATH".
2. **Flask** (a small library the app uses) — installed with one command below.

## How to run it

1. Unzip/open this folder.
2. Open a terminal in this folder:
   - **Windows**: right-click inside the folder → "Open in Terminal" (or open
     Command Prompt and `cd` into the folder).
   - **Mac**: right-click the folder → "New Terminal at Folder" (or open
     Terminal and `cd` into the folder).
3. Install Flask (only needed once):
   ```
   pip install flask
   ```
   If that says "pip not found", try `pip3 install flask` instead.
4. Start the app:
   ```
   python3 app.py
   ```
   (On Windows this might just be `python app.py`.)
5. You'll see a line like `Running on http://127.0.0.1:5000`. Open that
   address in your web browser.
6. To stop the app, go back to the terminal and press `Ctrl+C`.

## Using it

- **Home** — dashboard with total revenue, expenses, net profit, units sold,
  a sales trend chart by month, and your top products and customers.
- **Sales** — every sale you've logged, grouped by month with a monthly
  total, same as the reference app you were using.
- **Expenses** — track what you spend (vendor, category, amount), also
  grouped by month.
- **Customers** — save the people you sell to; sales can be tied to a
  customer or left as "Unknown Customer".
- **Products** — what you sell and how many times each has sold.
- Use **+ Sale** and **+ Expense** in the top right to log new entries.
  Every sale also records where it came from (in person, Facebook
  Marketplace, online, etc.) so it shows up correctly in the Sales list.

## Where your data lives

Everything is stored in a file called `sales_tracker.db` that appears in this
same folder the first time you run the app. Back that file up if you want to
keep your data — copying the whole folder is enough.

## Next steps (when you're ready)

- Putting this online (so you can use it from your phone or sell it to
  others) means adding user accounts/login and hosting it somewhere — that's
  a separate step from this local version, happy to help with that next.
