# Sort controls

`SortControls` is a controlled presentation component. Its caller owns the
current sort and view state and supplies the change handlers.

Supported sorts are price low to high, price high to low, newest first, and
oldest first. Geographic labels are not sort keys; the selected canonical Place
continues to scope the search independently.
