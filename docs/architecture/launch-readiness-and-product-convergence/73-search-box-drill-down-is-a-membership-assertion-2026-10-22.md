# The search-box drill-down is a membership assertion, not a display

**Branch:** `feat/suburb-first-search-ux-20261022`
**Date:** 2026-10-22

## What was attempted

When a customer types a city, the search box should offer the areas inside it, so they narrow
before any property search happens. The container's localities are the obvious source: the
municipality holds its areas, that edge is canonical, and it exists in every province today.

It was built, measured, and **withdrawn**, because offering a city's areas is not a display
affordance. It asserts that those areas are inside that city, and that membership is the thing
the canonical authority does not hold.

## What the attempt showed

The first build offered the container's localities under the city the customer typed. It produced
the right answer for a metro and the wrong answer for a main place:

```
### Johannesburg -> Johannesburg, Johannesburg North, Manufacta, Benmore Gardens, …
### Cape Town    -> Cape Town, Dieprivier, Cafda Village, Goodwood, …
### Melville     -> Melville, then Johannesburg's areas labelled "Melville"
```

"Melville" is one of the sixty-three published city rows with no members. The container's
areas belong to the metro, not to Diepsloot, Melville, Randburg or Soweto, so offering them
under the name the customer typed is a false claim about a place.

The same trap exists in the other direction. "Alberton" is a town cluster inside Ekurhuleni,
and Ekurhuleni's container holds 293 areas spread across Alberton, Benoni, Katlehong,
Tembisa, Thokoza and Vosloorus. Offering all 293 under "Alberton" is twenty times too wide.

## The rule this gives

**A drill-down set is a membership assertion, and it may only be offered where the membership
is attested.**

- Where the published geography attributes areas to a city, that set may be offered. Today that
  is Gauteng: Johannesburg 381, Pretoria 248, Alberton 14, Centurion 1.
- Where nothing attributes areas to a city, no drill-down may be offered under that city's name.
  That is the case for the sixty-three empty main places and for the eight provinces with no
  published geography.
- The container's localities remain the *municipality's* areas. They are not any city's areas
  until a membership says so.

This is the same rule as the scope contract in
`72-city-scope-contract-2026-10-22.md`, applied to discovery: nothing is offered under a place
name that the authority does not place there.

## What the drill-down needs to be built

Two things, in order.

**1. The recognisable set.** A customer typing "Johannesburg" does not want "Abbotsford"; they
want Sandton, Randburg, Rosebank, Soweto. Those are the sixty-three main places, which the
published geography already publishes as city rows. They are the drill-down set. Each one is a
*city* selection, so each one needs an authorised scope before it can search — and that is
exactly the sixty-three empty city rows, the gap named in the scope contract.

**2. The membership.** So that selecting one of those main places searches the area inside it
rather than nothing, the town-cluster edge has to be admitted. That is the per-city, on-demand
authorisation the scope contract describes: when a customer in a given city asks to search that
city, that city's membership is reviewed and authorised, and both the drill-down and the
"search across this city" action appear for it.

**The drill-down therefore lands with the first city authorisation, not before it.** Until then,
the suburb-first experience still works end to end: a customer who knows their suburb types it and
goes straight to listings, and a customer who types a city gets the city as a discovery target.

## The property-level cost of the empty main places

A customer who types "Diepsloot" today gets a location with zero properties. That is a live bug
and it is not fixed by the drill-down, the scope contract or the membership. It needs the
membership for those places specifically, and it is the strongest candidate for the first
on-demand city authorisation, because a name a customer actually types is currently a dead end.
