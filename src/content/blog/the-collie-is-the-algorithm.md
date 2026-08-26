---
title: The collie is the algorithm
publishDate: 2026-08-25 00:00:00
description: |
  Someone worked out that you can simulate a sheepdog with two rules. I didn't believe it, so I built it, then kept adding awkward sheep and obstacles to see when it would break. There are four simulations in here you can play against.
tags:
  - Farming
  - Simulation
  - AI
---

I love collies. On our last holiday to North Devon we went to a falconry and sheepdog show, and I spent most of it watching one dog move a scattered flock across a field and into a pen while the shepherd stood at the far end doing the occasional whistle. The sheep clearly didn't want to go in, but they went in anyway in about a minute, and I spent the rest of the day wondering how the dog actually does it.

I've always joked that collies are better than maths because they run on instinct, and whatever is going on in that dog's head isn't something you could write down, but it turns out someone had a go at doing exactly that. In 2014 a group from Swansea University, the Royal Veterinary College and Uppsala put GPS backpacks on 46 sheep and a working farm dog, recorded a load of herding, and then tried to find the simplest set of rules for a simulated dog that would produce the same tracks.

They got it down to two rules, which I didn't really believe, so I built it to see for myself. Once it was working I kept adding things (awkward sheep, obstacles, more sheep) to find out where it would fall over.

## The model from the paper

This is the model as it appears in the paper with nothing added, so thirty sheep, an open field and a pen. The purple arrow is the dog, and the status line underneath shows which of the two rules it's currently following, **COLLECT** or **DRIVE**. The dashed circle is how tightly packed the flock needs to be before the dog is happy to start pushing, and the small ring is the spot the dog is currently trying to get to.

If you press **You drive** you take over as the dog on the same flock, and it'll record how long you took next to the collie's time so you can compare.

<div class="sheepdog" data-sheepdog="paper">
  <canvas aria-label="Sheepdog simulation: the two-rule model on an open field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

This is all the code the dog runs on.

```js title="collie.js"
const gcm = centreOfMass(loose);
const straggler = furthestFrom(gcm, loose);

if (dist(straggler, gcm) > R_A * Math.pow(loose.length, 2 / 3)) {
  // COLLECT: stand just beyond the straggler, so running from the dog
  // means running back to the flock.
  return pointBeyond(straggler, awayFrom(gcm));
}
// DRIVE: stand behind the flock, on the far side from the pen, and push.
return pointBeyond(gcm, awayFrom(pen));
```

There's no planning and no memory in there, it just checks sixty times a second whether the flock is tight enough and runs to wherever that check tells it to. The sheep aren't any more complicated either. Each one moves away from the dog, moves towards its neighbours, tries not to get too close to them, and wanders about a bit at random, and all of the flocking behaviour you see comes out of that.

Most people can beat this version of the dog. You can see the whole field at once, and you don't have to slow down when you get near a sheep, whereas the simulated collie does because the real one in the study did. You might also notice it doing something a real collie wouldn't, which is running straight across the front of the flock on its way to a straggler. That comes up again in the second demo.

## Awkward sheep

In the paper every sheep is identical, which real sheep obviously aren't, so for this one I gave them a few different personalities:

- **Leaders** (orange ring) wander off in whatever direction they fancy, and the rest of the flock tends to drift after them.
- **Loners** hang around the edge of the flock and spook before anyone else does.
- **Old ewes** (grey) don't move until they feel like it. The dog has to come in close, stop and stare at them for a while before they'll budge.
- **Flighty ones** bolt as soon as the dog gets anywhere near, and run further than they need to.

When I put the paper's dog on this flock it kept running full circles around them, and about a fifth of the time it was between the sheep and the pen, which is the worst place for a dog to be. A real collie stays on the far side of the flock from where it wants them to go. If it needs to switch sides it goes round the back, it leaves alone any sheep that's already heading the right way, and it finishes bringing one sheep in before it goes after another. So I gave this dog some idea of which side it should be on (that's the **FLANK** state) and a bit of manners, so it keeps its distance, creeps in slowly and never actually touches a sheep. It's allowed to back off or walk round one it's close to, it just can't push in. It also won't drive on with a sheep behind it, it goes back for that one first. I also slowed it down to 80% pace, so it's a younger dog than the one in the first demo.

The other thing it does differently is where it stands when it goes to fetch a straggler. The paper's dog stands directly beyond the sheep, on the far side from the flock, and that's fine in an open field. Against a fence or in a corner it's a disaster, because the dog ends up pinning the sheep in there. This dog tries a few spots around the sheep and picks the one it can actually get to from which the sheep, running away from it, ends up back with the flock.

<div class="sheepdog" data-sheepdog="minds">
  <canvas aria-label="Sheepdog simulation: sheep with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

What I didn't expect was that the loners and leaders make no difference to the dog at all. The rule is "go and fetch the furthest sheep", and the sheep causing trouble is nearly always the furthest one anyway, so it gets dealt with without any special handling. The old ewes are the ones that slow it down, and if you have a go yourself you'll find they slow you down just as much.

## Obstacles

The field in the paper is completely empty, and the dog has no concept of an obstacle. If you put a pond in its way it runs into the edge and sits there pressing against it until the random noise happens to slide it off, which sometimes never happens. So I added a third rule, which is about as basic as the other two, and says that **if the straight line to where you want to go crosses something, aim for the edge of that thing instead** (**GO ROUND** on the status line). The dog applies the same rule to the flock, so if the wall is between the sheep and the pen it pushes them towards the end of the wall rather than straight at the middle of it. The sheep mostly didn't need a rule of their own, they just get pushed away from anything solid and the flock ends up flowing around obstacles by itself. The one thing I did give them is that they won't run themselves into a dead end, so a sheep that's been chased into the corner where a fence meets the edge of the field turns and runs along the fence instead of wedging itself in.

<div class="sheepdog" data-sheepdog="field">
  <canvas aria-label="Sheepdog simulation: a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

I ran both dogs on the same sixty fields. The paper's dog got stuck nine times out of sixty, and this one didn't get stuck at all. Interestingly, on the runs where the original dog did get through it wasn't any slower than the new one, so the third rule doesn't speed anything up, it just stops the dog getting wedged against a pond.

## Everything at once

Sixty sheep, all the personalities, obstacles, and the dog back at full pace. I haven't managed to beat it on this one yet. If you do it first time I'd genuinely like to see a recording.

<div class="sheepdog" data-sheepdog="farm">
  <canvas aria-label="Sheepdog simulation: sixty sheep with personalities on an obstacle field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 60 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

The reason the dog wins here is that it never goes after a sheep just because it's wandered off a bit. It only ever goes for the furthest one, and only when the flock has spread out enough that it actually matters. When a person drives, the natural thing to do is chase whichever sheep is straying, and that's usually what causes the flock to split in two. Over sixty runs the dog's median time was 31 seconds and the worst was about a minute and a half, usually because a leader wandered off to a far corner while the dog was busy at the other end. **New flock** gives you a different one if you want another go.

## Things I found out along the way

- Most of the work is done by the sheep, not the dog. If each sheep pays attention to fewer than about half the flock, no dog can pen them, however clever it is. Nearly every time I thought the dog had a bug, the actual problem was in the sheep.
- The pen needs a funnel and a gate, and both of those are the farmer's job. Without them the dog can get the flock right up to the entrance and still not get them in.
- Which way round the dog goes matters a lot. The paper's dog cuts across the front of the flock; making it go round the back instead halved the worst-case time, from about two minutes down to one.
- I added the standing-off and not-touching-sheep behaviour purely because the dog looked wrong without it, and it turned out to make it faster as well. A dog that barges in tends to pin sheep against walls and then has to sort out the mess it's made.
- Corners were the worst of it. A sheep pressed into the angle where a fence meets the edge of the field would just sit there, and so would the dog, because it was standing exactly where it pinned the sheep in and its manners wouldn't let it move. Fixing that wasn't a new rule for fetching, it was the dog picking a spot to stand from which the sheep has somewhere to run. That one change took the worst time on the flock with personalities from eighty seconds down to thirty five.
- Most of the remaining failures were the dog dithering rather than the rules being wrong. The classic case is two stragglers on opposite sides of the flock that take turns being the furthest, so the dog runs back and forth between them forever. Every fix I made was some version of making it commit, so pick a sheep and finish it, or pick a side of the pond and go round it.

So I suppose my joke about collies being better than maths wasn't quite right. The collie is doing the maths, it's just that a few hundred years of breeding have turned it into something the dog doesn't have to think about.

The thing I keep coming back to is how little of what I added actually mattered. Loads of it was tweaking, and the bits that made a difference would fit on a postcard. It's made me a bit suspicious of the long, detailed instructions I write for systems at work. Next time, I think I'll spend an afternoon watching the thing first and see if I can find the two rules that are actually doing the work.

<script src="/sim/sheepdog.js" data-astro-rerun></script>
<style>
  .sheepdog { margin: 1.5rem 0; }
  .sheepdog canvas {
    display: block; width: 100%; touch-action: none; cursor: crosshair;
    border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711;
  }
  .sheepdog-hud {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-stats { color: var(--gray-400); white-space: nowrap; }
  .sheepdog-controls {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm);
  }
  .sheepdog-controls button {
    font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200);
  }
  .sheepdog-controls button[aria-pressed="true"] { border-color: var(--accent-dark); color: var(--accent-dark); }
  .sheepdog-controls button:hover { border-color: var(--gray-500); }
  .sheepdog-controls label { margin-left: auto; color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
  .sheepdog-board {
    display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: baseline; margin-top: 0.6rem;
    font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-board b { color: var(--gray-0); font-weight: 600; }
  .sheepdog-verdict { color: var(--accent-dark); }
  .sheepdog-traits { margin-top: 0.4rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
</style>

---

*Source: Strömbom D., Mann R.P., Wilson A.M., Hailes S., Morton A.J., Sumpter D.J.T. & King A.J. (2014). [Solving the shepherding problem: heuristics for herding autonomous, interacting agents](https://royalsocietypublishing.org/doi/10.1098/rsif.2014.0719). J. R. Soc. Interface 11: 20140719. The personalities, obstacles, flanking and third rule are my additions. [Simulation code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/sheepdog.js).*
