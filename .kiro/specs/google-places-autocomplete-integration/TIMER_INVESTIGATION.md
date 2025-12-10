# Timer Investigation

## Issue
Tests are timing out even with fake timers implemented. The timeout occurs at 5000ms, suggesting that `userEvent.type()` or some other async operation is waiting for something that never completes.

## Hypothesis
The issue might be that:
1. `userEvent.type()` doesn't work well with fake timers in this configuration
2. The component has some async operation that's not controlled by fake timers
3. There's a React state update that's not being flushed properly

## Next Steps
1. Try using `vi.runAllTimers()` instead of `vi.advanceTimersByTime()`
2. Check if we need to configure userEvent differently for fake timers
3. Consider using `fireEvent` instead of `userEvent` for simpler, synchronous interactions
4. Add timeout configuration to the tests themselves

## Alternative Approach
Instead of fake timers, we could:
1. Reduce the number of iterations for faster execution
2. Use a simpler debounce mock
3. Test the debounce logic separately from the component

