# Admin Expenses Guide

## What the Expenses section is for

The `Expenses` section is the admin workspace for tracking business costs from the moment they are expected, through approval, through payment, and finally through proof capture.

In simple terms, it helps the admin answer these questions:

- What are we planning to spend?
- What costs have already been logged?
- What still needs approval?
- What has been paid already?
- Which business area did this expense support?
- Do we have proof for finance review later?

This page is not only a list of expenses. It is also a control panel that highlights what needs attention first.

## The 3 main ideas behind how it works

Every expense record is built around 3 things:

1. `Commercial status`
   This is the stage of the expense itself:
   - `Planned`
   - `Recorded`
   - `Paid`

2. `Operational link`
   This shows where the expense belongs in the business:
   - Packaging
   - Orders
   - Purchases
   - Inventory
   - Marketing
   - Operations
   - General

3. `Audit trail`
   This is the accountability side:
   - Who approved it?
   - When was it approved?
   - Who paid it?
   - When was it paid?
   - What is the proof reference?

If these three parts are complete, the expense becomes much easier to review later in reports and finance checks.

## The full expense lifecycle

### 1. Planned

Use `Planned` when the expense is expected but has not happened yet.

Example:

- Title: `August awareness teaser`
- Status: `Planned`
- Amount: `AED 450`
- Linked Module: `Marketing`
- Linked Reference: `August campaign launch`

Meaning:
The business knows this spend is coming, but it has not yet been settled.

### 2. Recorded

Use `Recorded` when the expense has happened or is due, but payment is still not fully closed.

Example:

- Title: `Courier wallet recharge`
- Status: `Recorded`
- Amount: `AED 320`
- Linked Module: `Orders`
- Linked Reference: `Order fulfillment run`

Meaning:
The cost is real and should now be tracked until payment proof is completed.

### 3. Paid

Use `Paid` when the expense has been fully settled and proof details are available.

Example:

- Title: `Dispatch tape restock`
- Status: `Paid`
- Paid By: `Finance Desk`
- Paid On: `2026-07-24`
- Proof Reference: `PAY-2407-18`

Meaning:
The expense is operationally closed and ready for later review.

## What appears on the page

The page is split into 6 practical areas:

1. Hero summary
2. Stats cards
3. Expense filters
4. Spend by module
5. Operational follow-up queue
6. Expense register

There is also an `Add Expense` / `Edit Expense` modal for creating and updating records.

## 1. Hero summary

The top banner explains the purpose of the page:

- track planned, recorded, and paid expenses
- connect each expense to the business stream it supports
- keep approval and payment proof in one place

This means the section is designed for operations follow-up, not just bookkeeping.

## 2. Stats cards

These cards give a fast health check of the whole expense workspace.

### Tracked Expenses

Shows the total number of expense records on the page.

Example:
If there are 6 expense records, the card shows `6`.

### Awaiting / Recorded

Counts how many expenses are currently in `Recorded` status.

This matters because `Recorded` usually means the team still needs payment follow-up or proof completion.

### Operationally Linked

Shows how many expenses are properly connected to a real business module.

Example:
If 5 out of 6 expenses are linked clearly, the card shows `5/6`.

### Payment Verified

Shows how many expenses are fully complete from an audit point of view.

For an expense to count here, it must:

- be `Paid`
- have `Paid By`
- have `Paid On`
- have `Proof Reference`

### Overdue Payments

Shows how many expenses are already overdue.

An expense becomes overdue when:

- status is `Recorded`
- expense date is before the system's current review date

This is one of the most important cards because it shows unsettled costs that should already have been closed.

### Tracked Value

Shows the total value of all expenses combined.

Example:
If the amounts are `540 + 320 + 450 + 210 + 175 + 95`, the tracked value is `AED 1,790`.

## 3. Expense filters

This section helps the admin narrow down the list.

### Search

The search field checks:

- expense title
- notes
- linked reference
- linked module name

Example searches:

- `courier`
- `campaign`
- `shipment`
- `orders`

### Category filter

Available categories:

- Packaging
- Delivery
- Operations
- Marketing
- Supplier Related
- Other

Use this when you want to review only one kind of cost.

Example:
Set category to `Delivery` to see only shipping-related expenses.

### Status filter

Available values:

- Planned
- Recorded
- Paid

Use this to review expenses by stage.

Example:
Set status to `Recorded` to focus on costs that still need settlement work.

### Module filter

Available linked modules:

- Packaging
- Orders
- Purchases
- Inventory
- Marketing
- Operations
- General

This filter is useful when one department wants to review only its own costs.

Example:
Set module to `Purchases` to see landed-cost and supplier-related spend only.

### Reset Filters

Returns all filters to their default state.

### Add Expense

Opens the form to create a new expense record.

## 4. Spend by module

This section groups expenses by their linked business area and shows:

- total spend for that module
- number of tracked expenses
- number pending
- number overdue

### What “pending” means here

A module item is counted as pending if the expense is:

- not `Paid`, or
- not fully verified with proof

So even if something says `Paid`, it may still show as pending if the proof trail is incomplete.

### Why this section matters

It tells the admin which department is carrying the most cost and which one needs attention.

Example:

- `Packaging`: AED 540
- `Orders`: AED 320 pending
- `Purchases`: AED 175 overdue

This quickly shows where follow-up pressure is building.

## 5. Operational follow-up queue

This is the action-driven part of the page.

The system automatically sorts the highest-priority expenses to the top.

It focuses on:

- overdue payments
- missing attribution
- missing approval
- missing proof

Each queue item shows:

- expense title
- operational state
- linkage health
- audit trail state
- module
- reference
- amount
- due date
- recommended next action

### How priority is decided

The page gives each expense a combined urgency score based on:

- operational state priority
- linkage health priority
- audit trail priority

Higher-risk issues appear first.

### Example

If `Import handling charge` is:

- `Recorded`
- already past its expense date
- approved but not fully settled

it will appear near the top because it is an overdue operational liability.

## 6. Expense register

This is the main table where admins review all records.

Each row includes:

- `Expense`
- `Category`
- `Operational Link`
- `Status`
- `Operational State`
- `Approval Trail`
- `Date`
- `Amount`
- `Recommendation`
- `Actions`

### Expense

Shows:

- title
- notes

This gives a quick explanation of what the spend is for.

### Category

Shows the type of expense, such as `Delivery` or `Marketing`.

### Operational Link

Shows:

- linked module
- linked reference

This is where the admin connects the cost to the actual part of the business it supports.

Examples:

- Module: `Orders`, Reference: `Order fulfillment run`
- Module: `Purchases`, Reference: `Incoming shipment landing cost`
- Module: `Marketing`, Reference: `August campaign launch`

### Status

Shows the manual workflow stage:

- Planned
- Recorded
- Paid

### Operational State

This is a system-generated state, not a manually selected one.

Possible values:

- `Settled`
- `Overdue Payment`
- `Awaiting Payment`
- `Upcoming Approval`
- `Planned`

#### How each operational state works

`Settled`
- given when status is `Paid`
- means no operational payment follow-up is expected

`Overdue Payment`
- given when status is `Recorded`
- and the expense date is already in the past
- means the cost was logged but is still unpaid after the expected date

`Awaiting Payment`
- given when status is `Recorded`
- but the date is not yet overdue

`Upcoming Approval`
- given when status is `Planned`
- and the expense date is within 2 days

`Planned`
- given when the expense is still for a future cycle

### Linkage health

This is also system-generated.

Possible values:

`Needs Attribution`
- used when no real module is assigned or module is `General`
- means the cost is too vague for strong reporting

`Reference Missing`
- used when the linked reference is empty
- means the admin did not state what exact order, batch, campaign, or process this cost supports

`Operationally Linked`
- used when both module and reference are properly filled

### Approval trail

This shows the quality of the audit information.

Possible values:

`Payment Verified`
- status is `Paid`
- `Paid By`, `Paid On`, and `Proof Reference` are all filled

`Proof Missing`
- status is `Paid`
- but one or more payment-proof fields are missing

`Approval Missing`
- status is `Planned` or `Recorded`
- and `Approved By` is empty

`Awaiting Payment Proof`
- status is `Recorded`
- approval exists
- but `Paid By` is still empty

`Trail Started`
- some admin trail data exists, but the record is not yet fully complete

### Recommendation

The system generates a next-step recommendation for each expense.

Examples:

- `Chase finance confirmation and close the payment gap.`
- `Capture the approver before this expense moves further in the cycle.`
- `Add the exact order, batch, campaign, or process this cost supports.`

This helps the admin know what to do next without interpreting the raw data manually.

### Actions

Currently the action is:

- `Edit`

This opens the existing expense in the form so the admin can fix or complete it.

## Add / Edit Expense form tutorial

This is the form the admin uses to create or update a record.

### Field-by-field explanation

#### Title

What the expense is called.

Good examples:

- `Courier wallet recharge`
- `Instagram teaser budget`
- `Packing foam restock`

Avoid vague titles like:

- `Payment`
- `Expense 1`
- `Misc`

#### Category

The type of expense.

Use this for expense grouping.

Examples:

- `Packaging` for tape, pouches, labels
- `Delivery` for courier, shipping wallet, dispatch spend
- `Marketing` for campaigns and creatives

#### Status

The stage of the expense:

- `Planned`: expected, not yet settled
- `Recorded`: logged, but not fully paid/closed
- `Paid`: finished and settled

#### Amount

The value of the expense in AED.

Example:
`320`

#### Expense Date

The date the expense is expected, recorded, or due.

This date affects whether the system marks the record as:

- upcoming
- awaiting payment
- overdue

#### Linked Module

The business area this expense supports.

Examples:

- `Orders` for fulfillment costs
- `Purchases` for supplier-side landed costs
- `Inventory` for stockroom maintenance
- `Marketing` for promotions

#### Linked Reference

The exact operational reason or object behind the expense.

Good examples:

- `Order fulfillment run`
- `Incoming shipment landing cost`
- `August campaign launch`
- `Dispatch station replenishment`

This field is very important because it makes the expense meaningful during review.

#### Approved By

Who authorized the expense.

Examples:

- `Operations Lead`
- `Procurement Lead`
- `Admin Manager`

#### Approved On

When the expense was approved.

#### Paid By

Who actually completed or confirmed the payment.

Example:
`Finance Desk`

#### Paid On

The payment date.

#### Proof Reference

The evidence of payment or settlement.

Examples:

- receipt number
- transaction ID
- voucher ID
- invoice reference

Good examples:

- `PAY-2407-18`
- `UTIL-0722`
- `TXN-88341`

#### Notes

A short explanation of why the expense exists and who needs it.

Good example:
`Recharge pending settlement approval for current order dispatch cycle.`

## Tutorial: how an admin should use the Expenses section

### Tutorial 1: Add a planned marketing expense

Use this when a future cost is known in advance.

Steps:

1. Open `Expenses`
2. Click `Add Expense`
3. Enter title: `August social media teaser`
4. Set category: `Marketing`
5. Set status: `Planned`
6. Enter amount: `450`
7. Select expense date: `2026-07-31`
8. Set linked module: `Marketing`
9. Enter linked reference: `August campaign launch`
10. Add notes: `Budget reserved for teaser creative and boosted reach.`
11. If already approved, add `Approved By` and `Approved On`
12. Save

Result:

- it appears in the register
- it may show as `Upcoming Approval` if the date is close
- if approval is missing, it will be flagged in the audit trail

### Tutorial 2: Record a delivery cost that still needs payment closure

Use this when the expense already exists operationally but payment proof is incomplete.

Steps:

1. Click `Add Expense`
2. Title: `Courier wallet recharge`
3. Category: `Delivery`
4. Status: `Recorded`
5. Amount: `320`
6. Expense date: `2026-07-27`
7. Linked module: `Orders`
8. Linked reference: `Order fulfillment run`
9. Approved By: `Fulfillment Lead`
10. Approved On: `2026-07-26`
11. Leave payment fields empty if payment is not yet fully captured
12. Add notes
13. Save

Result:

- the system will treat it as `Awaiting Payment` or `Overdue Payment`
- it may enter the follow-up queue
- the recommendation will guide the admin toward settlement proof

### Tutorial 3: Close a paid expense properly

Use this when the payment is finished and should be audit-ready.

Steps:

1. Open the expense row
2. Click `Edit`
3. Change status to `Paid`
4. Fill `Paid By`
5. Fill `Paid On`
6. Fill `Proof Reference`
7. Confirm approval details are present too
8. Save

Result:

- operational state becomes `Settled`
- audit trail becomes `Payment Verified`
- the record becomes cleaner for finance and reports

## Best practices for admins

- Always choose the most accurate `Linked Module`
- Never leave `Linked Reference` vague
- Use `Recorded` only when the cost is real and needs follow-up
- Do not mark an expense `Paid` unless proof details are available
- Capture `Approved By` early, especially for planned and recorded expenses
- Review the follow-up queue regularly
- Use filters during weekly or month-end review

## Common mistakes and what they cause

### Marking everything as General

Problem:
The expense loses useful reporting value.

Effect:
It may show as `Needs Attribution`.

### Using Paid without proof

Problem:
The row looks finished when it is not truly verifiable.

Effect:
It becomes `Proof Missing`.

### Leaving reference text too broad

Bad examples:

- `Operations`
- `Marketing work`
- `Order stuff`

Effect:
The expense becomes hard to trace later.

### Forgetting approval details

Problem:
The system cannot show who authorized the spend.

Effect:
It may be flagged as `Approval Missing`.

## Quick admin brief

The `Expenses` section is an admin control board for tracking business costs from planning to settlement. Each expense must have a status, a business link, and an audit trail. The page automatically highlights overdue items, missing approvals, missing proof, and weak operational attribution. Admins should use it to log costs, connect them to the right workstream, complete approval and payment details, and review the action queue regularly for follow-up.

## Important implementation note

At the moment, this page works from seeded frontend data in:

- `frontend/src/data/adminExpenseSeed.js`

The logic and UI behavior live in:

- `frontend/src/pages/admin/AdminExpensesPage.jsx`

This means the workflow is already designed and interactive in the UI, but it is not yet connected to a backend persistence layer.
