We shipped v4 today. It's smaller than the last release, mostly because we spent three weeks ripping out a caching layer that was causing more bugs than it solved. If you were on the beta and noticed sync getting flaky in March, that was us testing the fix in production without telling you. Sorry about that.

The headline feature is offline drafts, which sounds boring but took longer than anything we've built this year. Turns out reconciling two versions of the same document without a server in the loop is genuinely hard, and we're not fully happy with how conflicts get resolved yet. If you edit the same paragraph on two devices while offline, you'll get both versions stacked with a divider, and you pick. It's not elegant. We'll improve it.

Price is unchanged. A few people asked if this release finally adds dark mode; it doesn't, it's next on the list after we deal with a memory leak on the Windows build that's been bugging me since January.

Thanks to everyone who filed bugs during the beta, especially the person who found the sync issue by exporting their calendar at exactly midnight UTC. That's a strange one and we owe you a real explanation once we understand it ourselves.
