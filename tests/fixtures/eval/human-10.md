Our open rates dropped 12% after we switched email providers in April, and it took us six weeks to figure out why. Turns out the new provider was defaulting to a shared IP pool, and some previous tenant on that pool had been flagged for spam. We moved to a dedicated IP in May and mostly recovered, though our Gmail deliverability is still about 4 points below where it was in March.

If you're evaluating providers right now, ask specifically about IP reputation history before you sign anything. We didn't, and it cost us a full quarter of underperforming campaigns. Not the end of the world, but annoying enough that I wanted to write it down somewhere other people might find it.

The campaign that actually worked this year wasn't clever. We just emailed our top 200 customers individually, by hand, asking what they wanted next. Nineteen replied. Three of those turned into feature requests we shipped. That's a better hit rate than any automated sequence we've run.
