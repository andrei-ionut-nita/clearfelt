Spent most of Tuesday chasing down a memory leak in the image pipeline. Turned out to be a closure holding onto a buffer we never released. Not proud of how long that took me.

Anyway, fix is up for review. I also snuck in a small perf win while I was in there, cut decode time by about 15% on the test set, though I haven't checked it against the full corpus yet.
