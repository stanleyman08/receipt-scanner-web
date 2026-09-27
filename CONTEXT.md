# Receipt Scanner

Receipt Scanner lets Carino photograph paper receipts, reads the amounts with OCR, and files each receipt into a bucket so a whole year can be exported to Excel for bookkeeping.

## Language

**Receipt**:
A proof of purchase Carino keeps for bookkeeping, recorded with its vendor, receipt date, invoice number, subtotal, GST and total.
_Avoid_: Expense, transaction

**Receipt date**:
The purchase date printed on the receipt.
_Avoid_: Scan date, transaction date

**Scan**:
The photo-and-OCR step that pre-fills a receipt; the result becomes a receipt only once it's reviewed and saved.
_Avoid_: Upload, import

**Bucket**:
One category for one month, such as "April 2026 · Food", that receipts are filed into. A receipt's bucket normally matches its receipt date, but it can be chosen by hand.
_Avoid_: Folder, group

**Category**:
The kind of spending a bucket holds: Food, Supply or Other A. The list is fixed.
_Avoid_: Type, tag

**Account**:
The single sign-in everyone at Carino shares; whoever is signed in sees every receipt.
_Avoid_: User, profile

**Export**:
An Excel workbook of receipts, either for one bucket or for a whole year with one sheet per bucket.
_Avoid_: Report, CSV
