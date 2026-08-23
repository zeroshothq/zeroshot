# Unit economics: Batch 001

Do the cans make money? Short answer: the 12-can plan is thin, the 48-can plan
is underwater, and the price that would make either healthy is above what the
energy drink market pays.

Everything below is built from public cost ranges, not from quotes. The two
numbers that would move the whole model are an actual co-packer quote and an
actual negotiated carrier rate. Until we have those, treat the base case as a
planning figure and the high case as a real possibility.

Last updated 2026-08-22. Prices as configured in `scripts/setup-secrets.mjs`:
standard `$42.00/month` for 12 cans, `mixed-precision-24` `$95.00` one-time for
24 cans, team `$169.00/month` for 48 cans.

These replace the launch prices of $36, $60 and $99, which were set before this
model existed. At those numbers the 24 cleared $0.46 an order and the 48 lost
$17.67 every month it renewed.

## Cost inputs

### Landed cost per can

Includes liquid, can, fill, label, and freight into the fulfillment warehouse.

| Scenario | Cost per can | Basis |
|---|---|---|
| Low | $0.55 | Mid-scale run, 25k+ cans. Published range $0.30 to $0.70. |
| Base | $1.00 | First run at 5k to 10k cans, functional formula. Small-batch range $0.50 to $1.50. |
| High | $1.50 | Pilot run, premium actives. Premium functional runs up to $1.80. |

Minimum order quantity for a commercial run is 5,000 to 25,000 cans, which is
$5,000 to $30,000 of inventory for one SKU.

### Shipped weight

Twelve 12 oz cans: 9.0 lb of liquid, 0.4 lb of aluminum, about 1.0 lb of
shipper and dividers. Roughly 10.4 lb, billed at 11 lb. Beverages bill on
actual weight, not dimensional weight, so there is no packing trick that
reduces this.

### Carrier cost

Retail ground for a 12-pack of cans runs $12 to $20 and up depending on zone. A
3PL aggregating volume typically negotiates 15 to 30 percent below that.

| Scenario | 12-can carton | 24-can carton (about 21 lb) |
|---|---|---|
| Low | $9.00 | $22.00 |
| Base | $11.00 | $28.00 |
| High | $14.00 | $38.00 |

For reference, USPS Ground Advantage retail on a 20 lb parcel is about $22.75
to $27.30 for zones 1 through 4 and $55.50 to $69.40 for zones 7 and 8. A
single warehouse means roughly half of US demand pays the far-zone rate.

### Fulfillment

Pick and pack is $3.50 to $8.00 for the first item plus $0.50 to $1.50 for each
additional item. A 12-pack is one carton pick, so it sits at the low end.
Corrugate and dividers rated for 11 lb add about $1.50.

### Payments

Stripe takes 2.9 percent plus $0.30. On $42 that is $1.52, on $95 it is $3.06,
and on $169 it is $5.20.

## Standard plan: 12 cans at $42.00

| Line | Low | Base | High |
|---|---|---|---|
| Product (12 cans) | $6.60 | $12.00 | $18.00 |
| Carrier | $9.00 | $11.00 | $14.00 |
| Pick, pack, corrugate | $4.25 | $5.00 | $5.50 |
| Stripe | $1.52 | $1.52 | $1.52 |
| **Total cost** | **$21.37** | **$29.52** | **$39.02** |
| **Gross profit** | **$20.63** | **$12.48** | **$2.98** |
| **Gross margin** | **49.1%** | **29.7%** | **7.1%** |

Base case clears $12.48 per subscriber per month before any fixed cost, refund,
damage, or churn. The point of $42 over $36 is the high column: at $36 a bad
cost outcome lost money on every shipment, and at $42 it still clears.

Break-even is $29.14.

## Mixed Precision 24: 24 cans at $95.00, one time

Ships as a single carton of about 21 lb.

| Line | Low | Base | High |
|---|---|---|---|
| Product (24 cans) | $13.20 | $24.00 | $36.00 |
| Carrier (1 carton) | $22.00 | $28.00 | $38.00 |
| Pick, pack, corrugate | $4.75 | $5.50 | $6.00 |
| Stripe | $3.06 | $3.06 | $3.06 |
| **Total cost** | **$43.01** | **$60.56** | **$83.06** |
| **Gross profit** | **$51.99** | **$34.44** | **$11.94** |
| **Gross margin** | **54.7%** | **36.3%** | **12.6%** |

This is deliberately the highest-margin plan. A one-time order has no retention
value, so it has to earn its whole return on a single transaction, and the
product is the more bespoke one: role-based, curated per build, qualification
gated. Break-even is $59.53.

## Team plan: 48 cans at $169.00

Shipped as two 24-can cartons, which is cheaper than four 12-can cartons.

| Line | Low | Base | High |
|---|---|---|---|
| Product (48 cans) | $26.40 | $48.00 | $72.00 |
| Carrier (2 cartons) | $44.00 | $56.00 | $76.00 |
| Pick, pack, corrugate | $8.00 | $9.50 | $11.00 |
| Stripe | $5.20 | $5.20 | $5.20 |
| **Total cost** | **$83.60** | **$118.70** | **$164.20** |
| **Gross profit** | **$85.40** | **$50.30** | **$4.80** |
| **Gross margin** | **50.5%** | **29.8%** | **2.8%** |

Break-even is $117.20, which is why the launch price of $99 lost $17.67 a month.
Forty-eight cans is two cartons, and the second carton adds $28 of freight that
$99 never covered.

## Why there is no volume discount

Base case, per can:

| Plan | Price per can | Cost per can | Profit per can |
|---|---|---|---|
| Standard, 12 | $3.50 | $2.46 | $1.04 |
| Mixed Precision 24 | $3.96 | $2.52 | $1.44 |
| Team, 48 | $3.52 | $2.47 | $1.05 |

Pricing is deliberately flat at about $3.52 a can across every size. That looks
wrong until you look at what a bigger pack actually costs to move:

| Pack | Carrier total | Carrier per can |
|---|---|---|
| 12 | $11.00 | $0.92 |
| 24 | $28.00 | $1.17 |
| 48 | $56.00 | $1.17 |

The 12-pack is the most freight-efficient unit we have. Twenty-one pounds
crosses into a worse rate band, so a larger pack never earns back its own
shipping. Cost per can moves by six cents across the whole range.

Shipping is linear in weight and weight is linear in cans, so the only things
that amortize across a larger order are the Stripe fee and one pick. That is
not enough to fund a discount. Every earlier version of this pricing gave away
20 to 30 percent per can for volume that costs the same to serve, and the
difference came out of margin and went to the carrier.

The one place a real discount belongs is subscription against one time, which
is why the 24 is priced 12 percent per can above the two recurring plans.
Recurring revenue is worth discounting for. Volume is not.

## What the market pays

| Product | Pack | Price | Per can |
|---|---|---|---|
| Liquid Death | 12 | $14.99 DTC | $1.25 |
| Red Bull 8.4 oz | 12 | about $20 to $24 | $1.75 to $2.00 |
| Celsius | 12 | under $23 | under $2.00 |
| Alani Nu | 12 | $35.99 to $39.89 | $3.00 to $3.32 |
| **Zero Shot standard** | **12** | **$42.00** | **$3.50** |

We are priced above the market, about 5 percent per can over the most expensive
mainstream 12-pack and roughly double Celsius or Red Bull. That is a deliberate
position and it is the whole bet: at any mainstream price this product loses
money on freight, so it has to be sold as something other than an energy drink.
Nothing in this model works if a buyer is comparing us to the shelf.

The incumbents survive on a different cost structure. They sell wholesale at
roughly $1.20 to $1.50 per can against a $0.55 to $0.70 landed cost, and the
retailer or Amazon absorbs the last mile. Liquid Death runs 40 to 50 percent
gross margin that way. None of them are paying $11 to put twelve cans on a
doorstep.

## Price required for a healthy margin

Standard plan, base cost stack of $28.00 before Stripe:

| Target gross margin | Price | Per can |
|---|---|---|
| Break-even | $29.14 | $2.43 |
| 30% | $42.18 | $3.52 |
| 40% | $49.56 | $4.13 |
| 50% | $60.08 | $5.01 |

Team plan, base cost stack of $113.50 before Stripe:

| Target gross margin | Price |
|---|---|
| Break-even | $117.20 |
| 30% | $169.60 |
| 40% | $199.30 |

Forty percent margin on the standard plan needs $4.13 per can, which is 24
percent above the most expensive mainstream 12-pack on the shelf. That gap is
the whole problem: the price DTC economics demand is above the price the
category supports.

## The inventory gate comes first

Minimum run is 5,000 cans. Energy drinks typically carry 12 to 18 months of
shelf life. At 12 cans per subscriber per month, 5,000 cans needs about 417
subscriber-months to clear, so roughly 350 active subscribers to burn a
minimum run inside a year.

Below about 150 subscribers a minimum run expires before it sells, and the
write-off costs more than any margin question on this page. Subscriber count,
not price, is the first hard gate on Batch 001.

## Fixed costs to recover

Formulation $3k to $10k. Branding and packaging design $2k to $7k. Printing
plates a few thousand. First production run $5k to $30k. Licensing, legal, and
insurance $1k to $5k. Logistics and warehousing $3k to $15k. Marketing $5k to
$50k and up. A lean launch is $20k to $40k; a serious one is $75k to $100k and
up.

At the base case $12.48 of gross profit per standard subscriber per month, a
$40k launch takes 3,205 subscriber-months to recover: 500 subscribers for about
six and a half months. At the old $36 price the same launch needed a full year
at the same subscriber count, which is the clearest argument for the reprice.

## Recommendations

**1. Done: the catalogue is repriced to $42, $95 and $169.** Pack sizes stay at
12, 48 and 24. Every plan now sits near 30 percent in the base case and stays
positive in the high case, which the old prices did not. Applying this to Stripe
needs a new price object per plan, because `unit_amount` is immutable once a
price exists.

**1a. Run no discounts on the standard plan.** At 29.7 percent there is less
room here than the number suggests. A 20 percent off code takes the base case to
roughly 12 percent and puts the high case underwater. An annual prepay at two
months free ($420) nets about $47 for the year against $150 for plain monthly.
Annual prepay at full price is still worth doing, but for the cash to fund the
co-packer minimum and to stop churn, not for margin.

**2. Consider separating shipping from the product price.** $31 for the cans
plus $11 flat shipping is the same $42, but customers read a shipping line as
normal and a $42 sticker on twelve cans as expensive. It also makes zone pricing
and a pickup option possible later. The counter-argument is that an all-in price
is a cleaner promise and matches how the short links work, so this is a real
trade rather than an obvious win.

**3. Put the margin on the skills, not the cans.** The premium agent skills are
digital: no COGS, no carrier, no shelf life, about 96 percent margin after
Stripe. If the subscription is priced as skills plus cans at cost and shipping,
the drink stops being a P&L problem and becomes what it already is, which is
the best marketing object we have. The checkout copy already leads with the
skills arriving immediately.

**4. Two fulfillment nodes once volume supports it.** One warehouse means half
of US demand pays zone 5 through 8. East plus west cuts blended carrier cost
roughly 25 to 30 percent, about $3 per order, which is half of the current base
case gross profit.

**5. Treat wholesale as the eventual profit engine.** $1.30 per can wholesale
against a $0.55 landed cost is 58 percent margin with zero shipping exposure.
DTC is the launch channel and the story. It is not where a canned drink makes
money, and no brand in the table above pretends otherwise.

## Sources

- [How much does it cost to start an energy drink company](https://foodscientistforhire.com/how-much-does-it-cost-to-make-an-energy-drink-company/)
- [How to start an energy drink company in 2026](https://foodscientistforhire.com/how-to-start-an-energy-drink-company/)
- [Beverage fulfillment guide for DTC brands](https://3plguys.com/articles/beverage-fulfillment-guide-for-dtc-brands)
- [Beverage warehousing and fulfillment](https://shipdudes.com/blog/beverage-warehousing-and-fulfillment-complete-guide-for-liquid-products)
- [USPS Ground Advantage rates 2026](https://idshipthat.app/shipping-rates/usps-ground-advantage/)
- [Pick and pack fees in 2026](https://www.speedcommerce.com/insights/pick-and-pack-fees/)
- [How much does a 3PL cost in 2026](https://popcapacity.com/blog/how-much-does-a-3pl-cost)
- [Liquid Death revenue and valuation](https://sacra.com/c/liquid-death/)
- [Liquid Death strategy and business model](https://fasterthannormal.co/businesses/liquid-death)
- [Shipping costs and the move to direct-to-consumer](https://www.foodlogistics.com/transportation/article/21194222/shipping-costs-and-the-move-to-directtoconsumer)
