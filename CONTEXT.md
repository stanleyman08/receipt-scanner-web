# Receipt Scanner

Receipt Scanner lets two companies, Carino and Peko Peko, photograph paper receipts, reads the amounts with OCR, and files each receipt into a bucket so a whole year can be exported to Excel for bookkeeping.

## Language

**Company**:
A business whose receipts are kept and exported as its own books: Carino or Peko Peko. The list is fixed, and every receipt belongs to exactly one company.
_Avoid_: Business, restaurant, store, tenant

**Receipt**:
A proof of purchase a company keeps for bookkeeping, recorded with its vendor, receipt date, invoice number, subtotal, GST and total. A purchase both companies pay for is recorded as one receipt per company, each with that company's share.
_Avoid_: Expense, transaction

**Receipt date**:
The purchase date printed on the receipt.
_Avoid_: Scan date, transaction date

**Scan**:
The photo-and-OCR step that pre-fills a receipt; the result becomes a receipt only once it's reviewed and saved. What the OCR returned is kept for a while, to trace a misread.
_Avoid_: Upload, import

**Bucket**:
One category for one month of one company, such as "Peko Peko · April 2026 · Food", that receipts are filed into. A receipt's bucket normally matches its receipt date, but it can be chosen by hand.
_Avoid_: Folder, group

**Category**:
The kind of spending a bucket holds: Food, Supply or Other A. The list is fixed and the same for both companies.
_Avoid_: Type, tag

**Account**:
The single sign-in everyone at both companies shares; whoever is signed in can switch between the companies and see all their receipts.
_Avoid_: User, profile

**Export**:
An Excel workbook of one company's receipts, either for one bucket or for a whole year with one sheet per bucket.
_Avoid_: Report, CSV
