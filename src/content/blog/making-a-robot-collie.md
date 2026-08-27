---
title: Making a robot collie
publishDate: 2026-08-27 00:00:00
description: |
  Last time I wrote the sheepdog's rules by hand. This time I gave the dog a small neural network and let it work the rules out for itself, one generation at a time. You can evolve one in your browser, race the fastest one I found, watch it struggle on a harder field, train it for that field, look at what it's thinking while it runs, and then see how good a dog an hour of evolution can make.
tags:
  - Farming
  - Simulation
  - AI
---

In [the last post](/blog/the-collie-is-the-algorithm/) I built a sheepdog out of two rules from a paper. This time I wanted to see if a dog could work the rules out for itself. I didn't want to train it the usual way, with a big pile of data and gradient descent, because that's not how the real ones got good at it. Collies got good at it by the ones that could do the job getting to have puppies. So I did the same thing, in a simulation, in an afternoon.

The dog in these demos is a small neural network. It gets told where things are, and it says which way to run and how fast. It doesn't know the two rules from the paper, it doesn't know what a pen is, and nobody tells it when it's done well. Every generation I run a batch of them, keep the ones that got the most sheep in, mix their brains together with a few random changes, and go again.

## What the dog gets

It has the same body as the hand-written collie: it can't run faster than that dog, it can't turn faster than that dog (about a third of a turn a second, so no spinning on the spot), and it can't get closer than about two sheep-widths to a sheep, because a dog that runs through the middle of a flock isn't a sheepdog. Those three things are done by the world, not learned. Everything else is up to it.

It can see seventeen numbers, all measured from where it's standing:

<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>what it sees</th><th>why I gave it that</th></tr></thead>
<tbody>
<tr><td>where the middle of the flock is</td><td>the paper's dog pushes the middle</td></tr>
<tr><td>where the sheep furthest from the middle is</td><td>the paper's dog fetches that one</td></tr>
<tr><td>which way the pen is from the flock</td><td>it has to push them somewhere</td></tr>
<tr><td>how spread out the flock is</td><td>the paper's whole switch between collect and drive runs on this</td></tr>
<tr><td>how many sheep are still loose</td><td>so it can tell the end from the start</td></tr>
<tr><td>where the nearest sheep is, and how far</td><td>so it can keep its distance</td></tr>
<tr><td>where the nearest obstacle is, and how far</td><td>so it has a chance on the field with the pond</td></tr>
<tr><td>how fast the nearest sheep is moving</td><td>so it can tell a sheep that's standing its ground from one that's going</td></tr>
<tr><td>how fast the flock is moving</td><td>so it can tell whether what it's doing is working</td></tr>
</tbody></table></div>

Those go through ten neurons in the middle and come out as three numbers: a direction and a speed. That's 203 weights, and the weights are the whole dog.

```js title="dog.js"
// 17 inputs → 10 hidden → 3 outputs.
h = tanh(W1 · inputs);
[dx, dy, speed] = W2 · [h, 1];
run(normalise(dx, dy), sigmoid(speed));
```

A dog's score on a flock is how many sheep it got in, plus a bonus for finishing quickly, plus a bit for how close the loose ones got to the pen. That last bit matters early on, when nobody gets any in, because it means the dogs that at least push the flock the right way come out ahead of the ones that run off to a corner. Every generation gets fresh flocks, the same ones for every dog, so a dog can't learn one flock and coast.

## Why not train it the usual way

The normal way to teach a network something is a big pile of examples and gradient descent: show it a situation, tell it the right answer, nudge the weights a bit towards that, repeat a few million times. I didn't do that here, for three reasons.

- **There are no right answers to show it.** Nobody has a recording of what a perfect sheepdog does at every moment. All you can say about a run is what happened at the end: how many sheep got in, and how long it took. That's one number per run, and it arrives forty seconds after the decisions that earned it. You can do gradient methods with that kind of signal, that's reinforcement learning, but it takes a lot of machinery and a lot of care to make the one number reach back to the right decisions.
- **You can't take a gradient through the sheep.** The simulation has walls that stop you dead, sheep that either spook or don't, and random noise in every step. None of that has a slope, so there's nothing for gradient descent to follow, and the usual answer is to bolt a second network on to guess the slope, which is more machinery again.
- **The dog is tiny.** Two hundred numbers. A search that just tries variations and keeps the better ones is fine at that size, and it's the search real collies were found by.

It isn't free. Evolving the open-field dog took about twenty thousand trial runs to find those two hundred numbers, which is a ridiculous number of sheep to move for one dog, and a method that could use gradients would get there in a fraction of that if it could be made to work. I picked the slow way because it's the honest one for this problem, and because you can watch it happen.

## Basic evolution

This one evolves a batch of thirty-two dogs in your browser. Pick how many generations you want, press Evolve, and it runs them and stops. Each generation the dogs are trialled in the background, and the field shows the best dog of the latest generation having a go at a fixed flock. The chart is the score of the best dog and the average of the batch, and a score of 1 is every sheep in.

The first few generations are the interesting ones. Dogs run in circles, run to a corner and sit there, or push the flock the wrong way. Then one of them gets behind the flock by accident and the score jumps, and from there on the batch fills up with its descendants.

<div class="sheepdog robot-evolve" data-robot-collie="paper" data-pop="32" data-flocks="2">
  <canvas class="robot-field" aria-label="The best dog of the latest generation working a flock"></canvas>
  <div class="sheepdog-hud robot-hud-fixed">
    <span data-role="label">nothing evolved yet</span>
    <span class="sheepdog-stats"><span data-role="gen">generation 0</span> · <span data-role="best">best –</span></span>
  </div>
  <div class="sheepdog-hud robot-hud-fixed">
    <span data-role="status">lie down</span>
  </div>
  <div class="sheepdog-controls">
    <label class="robot-gens">generations <select data-role="gens"><option value="25">25</option><option value="50" selected>50</option><option value="100">100</option><option value="200">200</option></select></label>
    <button type="button" data-action="start">Evolve</button>
    <button type="button" data-action="reset">Start again</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <canvas class="robot-chart" data-role="chart" aria-label="Score by generation"></canvas>
  <div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog</span><span><i style="background:#c97c12"></i>batch average</span></div>
</div>

Fifty generations usually gets you a dog that pens the lot. Two hundred gets you a quicker one, but not much quicker. Start again gives you a new batch, and it's worth doing, because they don't all find the same trick and some of them don't find one at all.

## The fastest dog found

This is the best one I got, evolved properly on a machine rather than in the browser: three batches of forty-eight, a hundred and fifty generations each, and the finalists from each batch re-tested on thirty flocks none of them had seen. It's on the open field from the first demo last time. The three buttons are the robot collie, the paper's two-rule dog exactly as published (the same one as the first demo last time), and you.

<details class="demo-box">
<summary><span class="demo-title">The robot collie on the open field</span><span class="demo-desc">Robot collie vs the paper's dog vs you. Thirty sheep, nothing in the way.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="paper" data-brain="open" data-autostart="brain">
  <canvas aria-label="Sheepdog simulation: the robot collie on an open field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain" data-name="the robot collie">Watch the robot collie</button>
    <button type="button" data-mode="collie" data-name="the paper's dog">Watch the paper's dog</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Robot collie <b data-time="brain:open">–</b></span>
    <span>Paper's dog <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>
It's quick. Over sixty fresh flocks it penned the lot every time, with a median of 11.1 seconds and a worst of 14.9, against 16.1 and 32.3 for the paper's dog and 12.5 and 17.6 for the collie I wrote by hand for the later demos last time. On the same flocks it beat the paper's dog 55 times out of 59 and my collie 39 times out of 60. It's also, if you watch it for a bit, not doing what the paper's dog does. It stays behind the flock the whole time, it runs flat out, and it doesn't go and fetch stragglers. It gets behind the flock in line with the pen and pushes, and on this field that's enough.

## Away from home

That dog only ever saw one field: thirty identical sheep and nothing in the way. Here it is on the two harder fields from last time, with one change: I've taken the old ewes out of the awkward flock. They're a good demo for a hand-written dog that has a rule for them and a bad one for anything else, and this is a post about the anything else. So the first flock has leaders, loners and flighty sheep, and the second field has the pond, the wall and the trees. The buttons are the robot collie from the demo above ("open-field dog"), and then not the paper's dog but my collie, the hand-written one with flanking and the third rule that I built for these fields last time, which is the best hand-written dog I've got.

<details class="demo-box">
<summary><span class="demo-title">The open-field dog on the awkward flock</span><span class="demo-desc">Leaders, loners and flighty sheep. It has never seen any of them.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="awkward" data-brain="open">
  <canvas aria-label="Sheepdog simulation: the open-field robot collie on a flock with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>
<details class="demo-box">
<summary><span class="demo-title">The open-field dog on the obstacle field</span><span class="demo-desc">A pond, a wall and trees. It has never seen those either.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="field" data-brain="open">
  <canvas aria-label="Sheepdog simulation: the open-field robot collie on a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>
It's worse on the awkward sheep than at home, but not hopeless: forty-five full pens out of sixty, with twenty-eight of the thirty-six in on average. What beats it is the leader. It wanders off and takes a few with it, and this dog never goes after anyone, so a group ends up milling about at the mouth of the pen while the dog hangs back from the sheep nearest it. The obstacle field it mostly copes with, 54 out of 60, because the sheep flow round the pond and the wall on their own and a dog pushing from behind gets carried round with them. When it loses one there it's by pressing against the wall with the flock on the other side, which is what the paper's dog did with the pond last time.

## Training it on the harder fields

The fix is the same one that made real collies: put the harder fields in the training. This dog was evolved on the awkward flock and the obstacle field, turn and turn about, and never saw the open field at all. Same size of batch, two hundred generations instead of a hundred and fifty because it needed them, and a longer time limit because those fields take longer. Here it is on the two fields it was trained on, and then on the farm, which has sixty awkward sheep and all the obstacles, and which neither dog has ever seen. (It was trained with the old ewes in; the demos and the numbers are without them.) The buttons are the retrained dog ("farm dog"), the open-field dog from before, my hand-written collie, and you.

<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the awkward flock</span><span class="demo-desc">Same flock as above, with the dog that was trained for it.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="awkward" data-brain="farm" data-autostart="brain:farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on a flock with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>
<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the obstacle field</span><span class="demo-desc">Same field as above, with the dog that was trained for it.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="field" data-brain="farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>
<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the farm</span><span class="demo-desc">Sixty awkward sheep and all the obstacles. Neither dog has seen this field.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="farm2" data-brain="farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on the full farm"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 60 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>
On the obstacle field it's as good as the collie now: sixty out of sixty, and within a second of it on time. On the awkward flock it went from forty-five full pens in sixty to fifty-seven, and from twenty-eight sheep in on average to nearly thirty-five, a second and a half behind the collie on the median. The three it loses are the leader again: a group left at the mouth of the pen that it hangs back from and never quite finishes off. The farm, which it has never seen, it gets thirty-nine times out of sixty, with fifty-one of the sixty sheep in on average, where the open-field dog managed twelve and twenty-one. Not the collie, which gets all sixty, but a working dog.

## What it's thinking

The paper's dog tells you what it's doing: the status line says COLLECT or DRIVE. The robot collie doesn't have those words, it just has ten neurons in the middle and a direction coming out. So this one shows you the lot while it runs. On the left are the fifteen things it can see, in the middle the ten neurons, and at the bottom the direction and speed it chose. The line under the field is my attempt to read it in the paper's terms: if the direction it picked points at the spot the paper's dog would run to for COLLECT, it says COLLECT; if it points at the spot for DRIVE, it says DRIVE; and if it's going somewhere the paper's dog wouldn't, it says neither.

<div class="sheepdog robot-thoughts" data-robot-thoughts="paper" data-brain="open">
  <div class="robot-thoughts-main">
    <div class="robot-thoughts-field">
      <canvas class="robot-field" aria-label="The robot collie working a flock, with its network shown alongside"></canvas>
      <div class="sheepdog-hud">
        <span data-role="status">lie down</span>
      </div>
      <div class="sheepdog-hud">
        <span data-role="tally"></span>
      </div>
    </div>
    <div class="robot-thoughts-panel">
      <div class="robot-label">what it sees</div>
      <div class="robot-bars" data-role="inputs"></div>
      <div class="robot-label">the ten neurons</div>
      <div class="robot-bars" data-role="hidden"></div>
      <div class="robot-label">what it decided</div>
      <div class="robot-out" data-role="outputs"></div>
    </div>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
</div>

Two things stand out watching this. The first is that a third of the time it isn't doing either of the paper's rules. It reads as DRIVE about 40% of the time and COLLECT about 30%, and the rest of the time it's going somewhere in between, usually wide round the side of the flock, which is how it gets behind them without cutting across the front. Tick "workings" and you can see it: C and D are the two spots the paper's dog would be running to, the white line is where this dog is actually going, and much of the time it's neither. The second is which neurons do the work. Three of the ten sit pinned at 1 or −1 for the whole run and only shift the answer by a constant. The heading mostly comes from h7, which has the biggest weights on the output and moves all the time, and if you watch it against "nearest d" on the left you can more or less see the rule: keep the nearest sheep at the distance it likes, and go.

## The numbers

Everything here comes from the script in the repo, on the same code as the demos, with seeded flocks so it can be rerun. A dog's score on a flock is sheep penned (0 to 1) plus a bonus for finishing quickly (0 to 1) plus up to 0.3 for how close the loose sheep got, so anything over 2 is every sheep in and fast.

### Evolving the open-field dog

Three batches of 48, a hundred and fifty generations each, three fresh flocks a generation, a 40 second limit, about four and a half minutes a batch on eleven cores. One batch had a dog that penned a whole flock by generation 2, one by generation 17, and one not until generation 114. That's what this kind of evolution is like. Once a batch has one dog that gets behind the flock, its descendants take over in a few generations; until it has one, nothing much happens.

<figure class="robot-figure" data-chart="learning-open">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Score of the best dog and of the batch average, by generation, for each run (open field)" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Score of the best dog and of the batch average, by generation, for each run (open field)</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.14)"/><text x="36" y="142.6" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<line x1="44" x2="624" y1="45.2" y2="45.2" stroke="rgba(255,255,255,0.14)"/><text x="36" y="45.2" fill="#8490b5" text-anchor="end" dominant-baseline="middle">2</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="430.7" y="258" fill="#8490b5" text-anchor="middle">100</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">150</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">score (1 = every sheep in)</text>
<path d="M47.9 223.5 L51.7 203.6 L55.6 221.6 L59.5 221.4 L63.3 221.4 L67.2 220.4 L71.1 161.4 L74.9 165.0 L78.8 221.5 L82.7 222.5 L86.5 220.7 L90.4 219.7 L94.3 220.8 L98.1 219.2 L102.0 219.8 L105.9 220.3 L109.7 220.6 L113.6 219.4 L117.5 218.9 L121.3 218.9 L125.2 218.4 L129.1 219.3 L132.9 219.8 L136.8 218.1 L140.7 221.5 L144.5 220.8 L148.4 214.4 L152.3 220.0 L156.1 209.3 L160.0 220.3 L163.9 207.5 L167.7 219.7 L171.6 219.9 L175.5 215.7 L179.3 219.3 L183.2 220.1 L187.1 220.7 L190.9 216.7 L194.8 220.0 L198.7 221.1 L202.5 217.9 L206.4 205.4 L210.3 219.5 L214.1 219.2 L218.0 220.9 L221.9 220.9 L225.7 221.0 L229.6 219.6 L233.5 219.4 L237.3 214.8 L241.2 219.9 L245.1 219.5 L248.9 219.3 L252.8 220.1 L256.7 218.9 L260.5 220.5 L264.4 220.0 L268.3 213.7 L272.1 174.0 L276.0 201.1 L279.9 216.2 L283.7 220.3 L287.6 219.5 L291.5 219.2 L295.3 216.1 L299.2 195.1 L303.1 208.7 L306.9 218.7 L310.8 219.3 L314.7 197.9 L318.5 216.8 L322.4 219.0 L326.3 218.0 L330.1 201.6 L334.0 217.6 L337.9 194.4 L341.7 206.0 L345.6 210.1 L349.5 221.3 L353.3 215.9 L357.2 217.0 L361.1 220.3 L364.9 202.6 L368.8 220.0 L372.7 219.9 L376.5 218.9 L380.4 220.3 L384.3 218.8 L388.1 213.9 L392.0 217.2 L395.9 214.5 L399.7 200.3 L403.6 167.2 L407.5 219.4 L411.3 209.7 L415.2 191.3 L419.1 221.0 L422.9 170.9 L426.8 205.1 L430.7 148.5 L434.5 200.6 L438.4 205.4 L442.3 202.5 L446.1 203.1 L450.0 200.3 L453.9 188.9 L457.7 168.5 L461.6 152.3 L465.5 174.8 L469.3 188.7 L473.2 201.8 L477.1 193.7 L480.9 125.7 L484.8 78.2 L488.7 177.8 L492.5 174.5 L496.4 128.7 L500.3 177.2 L504.1 123.2 L508.0 137.4 L511.9 94.5 L515.7 66.7 L519.6 111.0 L523.5 142.9 L527.3 119.0 L531.2 95.0 L535.1 106.3 L538.9 93.2 L542.8 116.3 L546.7 42.8 L550.5 63.4 L554.4 57.3 L558.3 49.9 L562.1 111.0 L566.0 63.1 L569.9 52.3 L573.7 66.5 L577.6 60.9 L581.5 59.9 L585.3 55.2 L589.2 49.4 L593.1 63.0 L596.9 57.0 L600.8 50.7 L604.7 47.2 L608.5 51.3 L612.4 49.7 L616.3 49.6 L620.1 41.4 L624.0 46.4" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 1, best dog</title></path>
<path d="M47.9 227.7 L51.7 226.7 L55.6 226.8 L59.5 226.7 L63.3 226.1 L67.2 226.1 L71.1 224.1 L74.9 223.5 L78.8 226.0 L82.7 225.9 L86.5 225.3 L90.4 224.8 L94.3 225.2 L98.1 224.1 L102.0 225.3 L105.9 224.3 L109.7 224.5 L113.6 223.8 L117.5 223.3 L121.3 223.9 L125.2 223.9 L129.1 224.1 L132.9 223.5 L136.8 224.1 L140.7 225.1 L144.5 224.0 L148.4 222.7 L152.3 223.0 L156.1 221.3 L160.0 223.6 L163.9 223.1 L167.7 223.6 L171.6 222.5 L175.5 224.0 L179.3 222.8 L183.2 223.2 L187.1 223.4 L190.9 222.6 L194.8 224.0 L198.7 223.0 L202.5 222.8 L206.4 222.6 L210.3 223.3 L214.1 222.6 L218.0 224.2 L221.9 222.6 L225.7 224.4 L229.6 223.1 L233.5 222.8 L237.3 223.0 L241.2 223.9 L245.1 222.8 L248.9 223.1 L252.8 222.2 L256.7 221.3 L260.5 223.6 L264.4 222.0 L268.3 221.6 L272.1 219.8 L276.0 222.8 L279.9 223.7 L283.7 225.5 L287.6 222.3 L291.5 223.0 L295.3 223.3 L299.2 222.5 L303.1 222.2 L306.9 222.8 L310.8 224.0 L314.7 221.0 L318.5 223.9 L322.4 222.4 L326.3 221.8 L330.1 221.1 L334.0 222.8 L337.9 220.5 L341.7 221.5 L345.6 221.8 L349.5 223.6 L353.3 222.2 L357.2 222.2 L361.1 221.8 L364.9 221.4 L368.8 222.7 L372.7 223.8 L376.5 222.3 L380.4 223.2 L384.3 222.9 L388.1 221.5 L392.0 222.1 L395.9 222.0 L399.7 220.8 L403.6 211.2 L407.5 225.8 L411.3 221.3 L415.2 220.4 L419.1 224.7 L422.9 219.1 L426.8 224.2 L430.7 208.6 L434.5 222.3 L438.4 222.1 L442.3 222.8 L446.1 222.5 L450.0 220.1 L453.9 218.1 L457.7 217.7 L461.6 214.1 L465.5 216.6 L469.3 220.5 L473.2 219.7 L477.1 221.2 L480.9 216.3 L484.8 201.0 L488.7 215.8 L492.5 213.6 L496.4 201.9 L500.3 220.0 L504.1 212.1 L508.0 217.9 L511.9 197.1 L515.7 209.6 L519.6 210.9 L523.5 213.1 L527.3 209.0 L531.2 199.9 L535.1 192.1 L538.9 187.7 L542.8 194.1 L546.7 154.7 L550.5 188.6 L554.4 159.7 L558.3 170.6 L562.1 200.1 L566.0 186.0 L569.9 186.3 L573.7 174.0 L577.6 184.7 L581.5 173.8 L585.3 182.0 L589.2 166.6 L593.1 187.9 L596.9 180.7 L600.8 191.9 L604.7 170.9 L608.5 174.2 L612.4 148.9 L616.3 166.0 L620.1 160.5 L624.0 156.1" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 1, batch average</title></path>
<path d="M47.9 223.2 L51.7 221.0 L55.6 220.3 L59.5 170.2 L63.3 106.7 L67.2 221.7 L71.1 200.9 L74.9 161.7 L78.8 159.8 L82.7 176.9 L86.5 103.4 L90.4 167.2 L94.3 199.3 L98.1 116.1 L102.0 171.8 L105.9 115.7 L109.7 75.2 L113.6 104.3 L117.5 165.2 L121.3 164.6 L125.2 130.8 L129.1 136.8 L132.9 123.0 L136.8 147.6 L140.7 101.5 L144.5 99.5 L148.4 97.4 L152.3 107.0 L156.1 88.4 L160.0 75.5 L163.9 73.5 L167.7 50.5 L171.6 69.8 L175.5 46.8 L179.3 43.3 L183.2 46.4 L187.1 47.5 L190.9 42.5 L194.8 45.9 L198.7 43.8 L202.5 53.5 L206.4 42.1 L210.3 44.8 L214.1 41.2 L218.0 45.1 L221.9 40.4 L225.7 43.0 L229.6 44.1 L233.5 45.4 L237.3 43.0 L241.2 46.7 L245.1 44.8 L248.9 43.1 L252.8 41.1 L256.7 44.7 L260.5 40.9 L264.4 44.6 L268.3 41.0 L272.1 42.4 L276.0 41.4 L279.9 41.7 L283.7 46.3 L287.6 42.6 L291.5 45.3 L295.3 44.2 L299.2 41.1 L303.1 44.0 L306.9 42.2 L310.8 43.0 L314.7 41.5 L318.5 44.4 L322.4 40.9 L326.3 41.2 L330.1 43.3 L334.0 44.0 L337.9 41.3 L341.7 42.7 L345.6 40.4 L349.5 42.3 L353.3 43.2 L357.2 42.1 L361.1 42.7 L364.9 41.2 L368.8 41.0 L372.7 39.6 L376.5 42.4 L380.4 44.0 L384.3 40.5 L388.1 42.8 L392.0 43.1 L395.9 41.6 L399.7 43.8 L403.6 39.1 L407.5 44.5 L411.3 41.6 L415.2 43.6 L419.1 42.1 L422.9 40.3 L426.8 41.8 L430.7 38.5 L434.5 39.8 L438.4 43.5 L442.3 40.2 L446.1 40.4 L450.0 42.3 L453.9 39.5 L457.7 41.5 L461.6 40.5 L465.5 39.4 L469.3 39.8 L473.2 39.0 L477.1 41.9 L480.9 43.9 L484.8 38.9 L488.7 39.5 L492.5 40.8 L496.4 38.4 L500.3 40.8 L504.1 39.6 L508.0 40.2 L511.9 39.9 L515.7 39.7 L519.6 40.8 L523.5 42.2 L527.3 42.9 L531.2 41.2 L535.1 39.8 L538.9 40.5 L542.8 41.2 L546.7 38.0 L550.5 40.9 L554.4 39.1 L558.3 38.7 L562.1 41.7 L566.0 40.7 L569.9 40.3 L573.7 39.0 L577.6 42.9 L581.5 38.4 L585.3 40.4 L589.2 40.6 L593.1 39.3 L596.9 44.8 L600.8 44.2 L604.7 41.1 L608.5 40.8 L612.4 40.7 L616.3 41.6 L620.1 40.0 L624.0 40.4" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 2, best dog</title></path>
<path d="M47.9 227.7 L51.7 227.3 L55.6 226.4 L59.5 224.1 L63.3 223.8 L67.2 226.1 L71.1 224.7 L74.9 220.6 L78.8 225.0 L82.7 224.3 L86.5 221.0 L90.4 221.2 L94.3 225.1 L98.1 221.8 L102.0 223.2 L105.9 219.2 L109.7 220.8 L113.6 216.6 L117.5 220.7 L121.3 219.9 L125.2 221.8 L129.1 219.7 L132.9 218.5 L136.8 218.7 L140.7 215.7 L144.5 213.8 L148.4 200.2 L152.3 210.9 L156.1 190.0 L160.0 205.6 L163.9 198.6 L167.7 199.4 L171.6 197.5 L175.5 189.7 L179.3 197.5 L183.2 190.3 L187.1 190.0 L190.9 184.3 L194.8 173.8 L198.7 166.7 L202.5 159.7 L206.4 165.2 L210.3 157.7 L214.1 139.4 L218.0 163.2 L221.9 140.4 L225.7 160.8 L229.6 162.2 L233.5 159.9 L237.3 134.7 L241.2 159.5 L245.1 145.9 L248.9 141.6 L252.8 116.5 L256.7 141.5 L260.5 142.5 L264.4 141.7 L268.3 118.1 L272.1 145.6 L276.0 118.4 L279.9 97.4 L283.7 137.6 L287.6 135.9 L291.5 137.8 L295.3 120.2 L299.2 130.1 L303.1 130.0 L306.9 100.3 L310.8 120.1 L314.7 105.5 L318.5 132.9 L322.4 102.7 L326.3 104.4 L330.1 107.4 L334.0 110.6 L337.9 80.0 L341.7 96.7 L345.6 101.1 L349.5 102.5 L353.3 103.4 L357.2 114.0 L361.1 115.6 L364.9 85.6 L368.8 101.8 L372.7 89.6 L376.5 89.6 L380.4 139.1 L384.3 106.5 L388.1 116.0 L392.0 106.0 L395.9 96.9 L399.7 117.7 L403.6 74.0 L407.5 115.7 L411.3 96.2 L415.2 101.0 L419.1 85.9 L422.9 90.0 L426.8 79.2 L430.7 63.1 L434.5 74.1 L438.4 103.7 L442.3 57.7 L446.1 64.1 L450.0 74.9 L453.9 74.0 L457.7 84.9 L461.6 72.1 L465.5 95.1 L469.3 78.0 L473.2 68.7 L477.1 78.5 L480.9 106.4 L484.8 83.6 L488.7 68.3 L492.5 110.6 L496.4 73.8 L500.3 84.3 L504.1 64.0 L508.0 91.6 L511.9 87.3 L515.7 74.5 L519.6 83.5 L523.5 79.9 L527.3 65.9 L531.2 64.5 L535.1 69.5 L538.9 75.8 L542.8 80.6 L546.7 68.2 L550.5 85.7 L554.4 64.8 L558.3 76.1 L562.1 77.2 L566.0 96.3 L569.9 90.4 L573.7 92.1 L577.6 129.6 L581.5 59.4 L585.3 67.1 L589.2 79.4 L593.1 65.3 L596.9 96.2 L600.8 90.9 L604.7 57.0 L608.5 56.2 L612.4 58.2 L616.3 56.9 L620.1 73.7 L624.0 55.3" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 2, batch average</title></path>
<path d="M47.9 222.7 L51.7 57.2 L55.6 167.8 L59.5 221.8 L63.3 222.3 L67.2 161.7 L71.1 220.9 L74.9 209.9 L78.8 209.4 L82.7 203.3 L86.5 145.0 L90.4 173.1 L94.3 200.5 L98.1 196.0 L102.0 218.1 L105.9 214.8 L109.7 215.1 L113.6 200.6 L117.5 216.3 L121.3 209.7 L125.2 193.1 L129.1 217.2 L132.9 214.0 L136.8 194.9 L140.7 188.6 L144.5 219.2 L148.4 199.5 L152.3 194.6 L156.1 167.4 L160.0 200.9 L163.9 156.4 L167.7 195.7 L171.6 201.5 L175.5 174.6 L179.3 161.4 L183.2 199.7 L187.1 206.6 L190.9 183.7 L194.8 169.2 L198.7 175.0 L202.5 162.8 L206.4 134.7 L210.3 174.9 L214.1 142.2 L218.0 171.3 L221.9 69.2 L225.7 119.5 L229.6 161.8 L233.5 89.8 L237.3 130.5 L241.2 144.6 L245.1 136.6 L248.9 114.3 L252.8 108.9 L256.7 136.7 L260.5 55.2 L264.4 112.7 L268.3 93.7 L272.1 108.2 L276.0 74.3 L279.9 125.5 L283.7 63.3 L287.6 111.4 L291.5 113.1 L295.3 125.9 L299.2 59.1 L303.1 53.6 L306.9 79.2 L310.8 56.0 L314.7 101.3 L318.5 65.6 L322.4 53.8 L326.3 78.3 L330.1 51.2 L334.0 43.9 L337.9 45.2 L341.7 58.1 L345.6 52.2 L349.5 47.7 L353.3 44.2 L357.2 40.9 L361.1 43.2 L364.9 41.4 L368.8 44.1 L372.7 42.4 L376.5 42.3 L380.4 43.9 L384.3 45.6 L388.1 44.9 L392.0 45.5 L395.9 41.1 L399.7 43.8 L403.6 38.3 L407.5 45.4 L411.3 44.9 L415.2 43.0 L419.1 46.9 L422.9 41.5 L426.8 42.1 L430.7 37.8 L434.5 42.3 L438.4 44.5 L442.3 42.1 L446.1 42.5 L450.0 42.1 L453.9 41.8 L457.7 45.0 L461.6 42.8 L465.5 42.6 L469.3 41.5 L473.2 40.0 L477.1 44.0 L480.9 42.0 L484.8 38.0 L488.7 40.5 L492.5 40.9 L496.4 39.1 L500.3 41.3 L504.1 39.8 L508.0 41.2 L511.9 41.6 L515.7 41.1 L519.6 40.6 L523.5 41.8 L527.3 42.1 L531.2 41.4 L535.1 39.6 L538.9 40.6 L542.8 40.6 L546.7 39.2 L550.5 42.1 L554.4 38.9 L558.3 38.4 L562.1 41.7 L566.0 40.9 L569.9 41.5 L573.7 39.8 L577.6 44.4 L581.5 39.5 L585.3 40.1 L589.2 41.4 L593.1 40.9 L596.9 45.1 L600.8 43.9 L604.7 42.4 L608.5 41.7 L612.4 42.7 L616.3 42.1 L620.1 39.6 L624.0 40.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 3, best dog</title></path>
<path d="M47.9 227.8 L51.7 223.8 L55.6 225.3 L59.5 226.6 L63.3 226.3 L67.2 225.2 L71.1 225.6 L74.9 224.9 L78.8 225.6 L82.7 224.5 L86.5 223.0 L90.4 223.5 L94.3 224.9 L98.1 224.5 L102.0 225.0 L105.9 224.4 L109.7 224.2 L113.6 223.3 L117.5 223.5 L121.3 224.7 L125.2 222.9 L129.1 224.8 L132.9 223.7 L136.8 222.9 L140.7 223.8 L144.5 223.5 L148.4 222.1 L152.3 223.6 L156.1 217.9 L160.0 223.7 L163.9 215.7 L167.7 221.9 L171.6 222.5 L175.5 223.4 L179.3 219.4 L183.2 223.7 L187.1 223.6 L190.9 221.3 L194.8 221.2 L198.7 222.6 L202.5 215.1 L206.4 212.1 L210.3 221.5 L214.1 217.8 L218.0 220.9 L221.9 204.1 L225.7 215.4 L229.6 217.4 L233.5 204.6 L237.3 209.6 L241.2 205.8 L245.1 217.5 L248.9 210.1 L252.8 208.5 L256.7 214.9 L260.5 206.1 L264.4 211.8 L268.3 210.4 L272.1 206.1 L276.0 209.9 L279.9 209.4 L283.7 209.7 L287.6 204.1 L291.5 200.9 L295.3 210.9 L299.2 202.4 L303.1 201.6 L306.9 196.9 L310.8 199.5 L314.7 204.7 L318.5 200.1 L322.4 197.8 L326.3 199.9 L330.1 196.2 L334.0 176.6 L337.9 175.1 L341.7 182.9 L345.6 167.3 L349.5 165.4 L353.3 168.1 L357.2 163.7 L361.1 162.0 L364.9 135.0 L368.8 157.0 L372.7 151.6 L376.5 128.2 L380.4 134.2 L384.3 143.2 L388.1 144.8 L392.0 131.3 L395.9 101.2 L399.7 131.8 L403.6 120.5 L407.5 127.9 L411.3 110.7 L415.2 110.4 L419.1 143.2 L422.9 112.1 L426.8 102.3 L430.7 108.4 L434.5 109.9 L438.4 117.0 L442.3 111.9 L446.1 103.3 L450.0 122.6 L453.9 130.1 L457.7 123.8 L461.6 105.0 L465.5 114.7 L469.3 106.1 L473.2 91.4 L477.1 84.2 L480.9 89.7 L484.8 100.2 L488.7 59.1 L492.5 64.7 L496.4 71.7 L500.3 74.8 L504.1 82.8 L508.0 86.4 L511.9 87.4 L515.7 76.7 L519.6 89.9 L523.5 91.3 L527.3 101.3 L531.2 88.0 L535.1 76.9 L538.9 74.9 L542.8 90.3 L546.7 81.5 L550.5 98.7 L554.4 86.2 L558.3 66.8 L562.1 89.1 L566.0 92.9 L569.9 81.2 L573.7 87.4 L577.6 93.7 L581.5 64.0 L585.3 75.6 L589.2 89.6 L593.1 82.9 L596.9 97.9 L600.8 110.5 L604.7 81.7 L608.5 87.2 L612.4 74.0 L616.3 84.8 L620.1 79.9 L624.0 67.6" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 3, batch average</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog (one line per run)</span><span><i style="background:#c97c12"></i>batch average</span></div>
<figcaption>Score of the best dog and of the batch average, by generation, for the three open-field batches. The dashed line is every sheep in with no time to spare.</figcaption>
</figure>

The champion is chosen honestly: the best dog from each of the last twenty generations of each batch was re-run on thirty flocks none of them had seen, and the one with the best score there took it. It penned all thirty, median 10.1 seconds.

### Sixty flocks on the open field

<!-- TABLE:race -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>dog</th><th class="num">penned all</th><th class="num">median</th><th class="num">worst</th><th class="num">behind the flock</th><th class="num">near a sheep</th></tr></thead>
<tbody>
<tr><td>robot collie, open field</td><td class="num">60 / 60</td><td class="num">11.1s</td><td class="num">14.9s</td><td class="num">99%</td><td class="num">2%</td></tr>
<tr><td>robot collie, best</td><td class="num">60 / 60</td><td class="num">10.7s</td><td class="num">16.7s</td><td class="num">100%</td><td class="num">2%</td></tr>
<tr><td>my collie</td><td class="num">60 / 60</td><td class="num">12.5s</td><td class="num">17.6s</td><td class="num">87%</td><td class="num">4%</td></tr>
<tr><td>the paper's dog</td><td class="num">59 / 60</td><td class="num">16.1s</td><td class="num">32.3s</td><td class="num">71%</td><td class="num">14%</td></tr>
</tbody></table></div>
<!-- /TABLE -->

"Behind the flock" is the share of the run spent on the far side of the flock from the pen, and "near a sheep" is the share spent within three sheep-widths of one. The robot collie is the fastest on the median and, which surprised me, on the worst case as well: sixty flocks and never slower than fifteen seconds. Before I gave it the turning limit it had two failures in sixty, both a dog pinned against the edge of the field with the flock waiting in the middle; with the limit, none.

<figure class="robot-figure" data-chart="race">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Time to pen all thirty sheep on sixty flocks, each dog's runs sorted fastest to slowest" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Time to pen all thirty sheep on sixty flocks, each dog's runs sorted fastest to slowest</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">20</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">40</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="140.7" y="258" fill="#8490b5" text-anchor="middle">10</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">20</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">30</text>
<text x="430.7" y="258" fill="#8490b5" text-anchor="middle">40</text>
<text x="527.3" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">60</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">flocks, sorted by that dog's time</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">seconds</text>
<path d="M53.7 195.4 L63.3 192.5 L73.0 190.5 L82.7 189.5 L92.3 187.6 L102.0 187.3 L111.7 187.3 L121.3 187.1 L131.0 187.1 L140.7 187.0 L150.3 186.9 L160.0 186.8 L169.7 185.6 L179.3 185.6 L189.0 184.9 L198.7 184.7 L208.3 184.7 L218.0 184.6 L227.7 182.9 L237.3 182.1 L247.0 181.5 L256.7 181.1 L266.3 181.0 L276.0 180.7 L285.7 180.5 L295.3 180.3 L305.0 180.2 L314.7 178.8 L324.3 178.0 L334.0 177.7 L343.7 177.6 L353.3 176.7 L363.0 176.5 L372.7 176.4 L382.3 176.3 L392.0 175.9 L401.7 175.8 L411.3 175.6 L421.0 175.1 L430.7 174.8 L440.3 174.8 L450.0 174.7 L459.7 174.6 L469.3 174.2 L479.0 173.8 L488.7 173.6 L498.3 173.6 L508.0 173.5 L517.7 173.2 L527.3 173.1 L537.0 172.7 L546.7 171.1 L556.3 170.8 L566.0 170.4 L575.7 169.9 L585.3 169.3 L595.0 168.9 L604.7 165.9 L614.3 165.4 L624.0 156.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>robot collie</title></path>
<path d="M53.7 194.0 L63.3 193.4 L73.0 191.0 L82.7 190.3 L92.3 188.9 L102.0 188.1 L111.7 186.5 L121.3 186.3 L131.0 185.0 L140.7 182.7 L150.3 181.9 L160.0 181.9 L169.7 181.8 L179.3 181.3 L189.0 180.4 L198.7 180.0 L208.3 179.5 L218.0 179.1 L227.7 178.8 L237.3 178.1 L247.0 177.5 L256.7 177.3 L266.3 177.3 L276.0 176.3 L285.7 174.9 L295.3 174.3 L305.0 173.9 L314.7 173.5 L324.3 171.6 L334.0 170.5 L343.7 169.5 L353.3 169.0 L363.0 169.0 L372.7 167.9 L382.3 167.3 L392.0 167.1 L401.7 166.5 L411.3 166.4 L421.0 166.2 L430.7 164.7 L440.3 164.0 L450.0 163.7 L459.7 161.6 L469.3 161.1 L479.0 159.0 L488.7 158.8 L498.3 158.2 L508.0 158.1 L517.7 158.1 L527.3 158.1 L537.0 158.0 L546.7 157.8 L556.3 155.8 L566.0 153.9 L575.7 153.8 L585.3 152.5 L595.0 144.7 L604.7 143.9 L614.3 143.1 L624.0 141.5" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>my collie</title></path>
<path d="M53.7 199.0 L63.3 189.7 L73.0 187.8 L82.7 185.5 L92.3 181.4 L102.0 179.6 L111.7 178.4 L121.3 177.4 L131.0 177.3 L140.7 171.5 L150.3 171.2 L160.0 168.6 L169.7 168.0 L179.3 168.0 L189.0 167.9 L198.7 167.7 L208.3 167.7 L218.0 166.9 L227.7 166.2 L237.3 166.1 L247.0 164.9 L256.7 163.6 L266.3 160.5 L276.0 159.2 L285.7 159.1 L295.3 152.1 L305.0 151.2 L314.7 150.8 L324.3 150.4 L334.0 150.0 L343.7 148.3 L353.3 147.2 L363.0 146.9 L372.7 146.6 L382.3 145.7 L392.0 145.0 L401.7 144.9 L411.3 144.8 L421.0 142.7 L430.7 142.2 L440.3 140.4 L450.0 136.9 L459.7 136.1 L469.3 134.1 L479.0 133.9 L488.7 133.7 L498.3 133.6 L508.0 132.2 L517.7 132.0 L527.3 131.5 L537.0 127.0 L546.7 113.3 L556.3 108.1 L566.0 103.5 L575.7 101.7 L585.3 99.4 L595.0 97.8 L604.7 93.6 L614.3 58.9" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>the paper's dog</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>robot collie (open field)</span><span><i style="background:#35a066"></i>my collie</span><span><i style="background:#c97c12"></i>the paper's dog</span></div>
<figcaption>Time to pen all thirty sheep on the same sixty flocks, each dog's runs sorted from fastest to slowest.</figcaption>
</figure>

### What it actually looks at

Switching off one thing it can see at a time, and re-running it on thirty flocks:

<!-- TABLE:ablation-open -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>switched off</th><th class="num">score</th><th class="num">penned all</th></tr></thead>
<tbody>
<tr><td>nothing (the dog as evolved)</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
<tr><td>nearest sheep, how far</td><td class="num">0.19</td><td class="num">0 / 30</td></tr>
<tr><td>nearest obstacle</td><td class="num">0.51</td><td class="num">6 / 30</td></tr>
<tr><td>flock centre</td><td class="num">1.75</td><td class="num">27 / 30</td></tr>
<tr><td>nearest sheep speed</td><td class="num">1.93</td><td class="num">29 / 30</td></tr>
<tr><td>flock to pen</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>furthest sheep</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>nearest sheep, where</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>how spread out</td><td class="num">2.01</td><td class="num">30 / 30</td></tr>
<tr><td>flock speed</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
<tr><td>share still loose</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
</tbody></table></div>
<!-- /TABLE -->

That table is stranger than it looks. Switch off where the pen is, where the furthest sheep is, how spread out the flock is, how many are loose, where the nearest sheep is, or how fast anything is moving, and nothing happens: it still pens thirty out of thirty. Switch off where the flock centre is and it drops a bit. Switch off how far the nearest sheep is and it's useless. The obstacle one is a trick: on a field with no obstacles that input reads a constant 2, and the dog is using it as a second bias, so switching it off breaks the sums rather than blinding it. So on the open field this is a one-input dog. It keeps the nearest sheep at the distance it likes and runs, and everything else, including the pen, is dead weight, because on this field the pen is always to the right and the sheep are always the same.

### Away from home, and after training for it

<!-- TABLE:away -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>field</th><th class="num">dog</th><th class="num">penned all</th><th class="num">sheep in, average</th><th class="num">median</th></tr></thead>
<tbody>
<tr><td>awkward flock (36)</td><td class="num">robot collie, open field</td><td class="num">45 / 60</td><td class="num">28.1</td><td class="num">14.8s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">57 / 60</td><td class="num">34.8</td><td class="num">19.1s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">59 / 60</td><td class="num">35.5</td><td class="num">15.8s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">36.0</td><td class="num">17.7s</td></tr>
<tr><td>pond, wall and trees (30)</td><td class="num">robot collie, open field</td><td class="num">54 / 60</td><td class="num">27.0</td><td class="num">15.8s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">14.9s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">13.3s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">14.1s</td></tr>
<tr><td>the farm (60, everything)</td><td class="num">robot collie, open field</td><td class="num">12 / 60</td><td class="num">20.6</td><td class="num">25.6s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">39 / 60</td><td class="num">51.0</td><td class="num">30.4s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">52 / 60</td><td class="num">55.5</td><td class="num">31.5s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">60.0</td><td class="num">27.9s</td></tr>
</tbody></table></div>
<!-- /TABLE -->

<figure class="robot-figure" data-chart="learning-farm">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Score of the best dog and of the batch average, by generation, for each run (awkward flock and obstacle field)" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Score of the best dog and of the batch average, by generation, for each run (awkward flock and obstacle field)</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.14)"/><text x="36" y="142.6" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<line x1="44" x2="624" y1="45.2" y2="45.2" stroke="rgba(255,255,255,0.14)"/><text x="36" y="45.2" fill="#8490b5" text-anchor="end" dominant-baseline="middle">2</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="189.0" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">100</text>
<text x="479.0" y="258" fill="#8490b5" text-anchor="middle">150</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">200</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">score (1 = every sheep in)</text>
<path d="M46.9 224.0 L49.8 219.3 L52.7 222.1 L55.6 219.0 L58.5 176.2 L61.4 181.7 L64.3 172.2 L67.2 135.2 L70.1 180.9 L73.0 135.9 L75.9 175.5 L78.8 163.6 L81.7 168.4 L84.6 134.3 L87.5 137.0 L90.4 106.3 L93.3 131.6 L96.2 143.0 L99.1 133.8 L102.0 111.2 L104.9 92.9 L107.8 121.7 L110.7 94.2 L113.6 130.6 L116.5 135.5 L119.4 94.4 L122.3 133.5 L125.2 109.2 L128.1 102.0 L131.0 132.6 L133.9 132.9 L136.8 111.2 L139.7 131.5 L142.6 131.2 L145.5 135.5 L148.4 121.2 L151.3 133.7 L154.2 128.8 L157.1 119.4 L160.0 96.6 L162.9 128.9 L165.8 130.0 L168.7 128.9 L171.6 92.9 L174.5 107.6 L177.4 131.3 L180.3 110.2 L183.2 121.3 L186.1 88.2 L189.0 94.0 L191.9 91.6 L194.8 117.1 L197.7 119.7 L200.6 118.8 L203.5 111.6 L206.4 128.5 L209.3 107.9 L212.2 108.6 L215.1 100.0 L218.0 113.3 L220.9 117.6 L223.8 132.1 L226.7 80.7 L229.6 68.7 L232.5 96.5 L235.4 114.8 L238.3 104.6 L241.2 101.7 L244.1 133.0 L247.0 98.7 L249.9 73.2 L252.8 88.2 L255.7 104.2 L258.6 61.8 L261.5 89.5 L264.4 57.7 L267.3 92.7 L270.2 95.0 L273.1 90.4 L276.0 84.6 L278.9 102.0 L281.8 84.0 L284.7 80.8 L287.6 96.1 L290.5 41.3 L293.4 86.9 L296.3 51.5 L299.2 82.5 L302.1 63.4 L305.0 78.9 L307.9 66.4 L310.8 46.7 L313.7 73.6 L316.6 68.7 L319.5 39.1 L322.4 46.5 L325.3 47.5 L328.2 42.2 L331.1 47.3 L334.0 94.1 L336.9 89.5 L339.8 78.5 L342.7 104.9 L345.6 89.0 L348.5 87.9 L351.4 70.9 L354.3 76.5 L357.2 49.9 L360.1 44.6 L363.0 96.6 L365.9 97.4 L368.8 77.3 L371.7 53.6 L374.6 76.6 L377.5 67.8 L380.4 105.2 L383.3 43.0 L386.2 43.0 L389.1 85.1 L392.0 61.7 L394.9 52.2 L397.8 91.4 L400.7 70.6 L403.6 43.1 L406.5 80.2 L409.4 90.8 L412.3 79.1 L415.2 54.6 L418.1 51.5 L421.0 80.6 L423.9 86.5 L426.8 48.9 L429.7 65.7 L432.6 108.3 L435.5 81.9 L438.4 84.7 L441.3 68.3 L444.2 86.6 L447.1 42.1 L450.0 54.5 L452.9 43.4 L455.8 81.2 L458.7 81.5 L461.6 71.3 L464.5 47.7 L467.4 53.3 L470.3 93.5 L473.2 86.6 L476.1 97.3 L479.0 48.0 L481.9 93.0 L484.8 48.3 L487.7 98.4 L490.6 69.2 L493.5 49.0 L496.4 86.0 L499.3 69.8 L502.2 55.9 L505.1 92.9 L508.0 58.6 L510.9 48.0 L513.8 105.4 L516.7 88.4 L519.6 49.4 L522.5 46.6 L525.4 75.1 L528.3 48.0 L531.2 55.8 L534.1 57.8 L537.0 51.3 L539.9 77.4 L542.8 68.4 L545.7 47.4 L548.6 49.3 L551.5 49.4 L554.4 73.5 L557.3 88.0 L560.2 47.1 L563.1 69.0 L566.0 52.1 L568.9 56.7 L571.8 56.7 L574.7 75.1 L577.6 89.9 L580.5 57.6 L583.4 59.6 L586.3 74.0 L589.2 60.3 L592.1 53.9 L595.0 54.0 L597.9 109.8 L600.8 48.2 L603.7 48.3 L606.6 62.6 L609.5 45.8 L612.4 64.1 L615.3 42.7 L618.2 79.8 L621.1 48.1 L624.0 43.3" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 1, best dog</title></path>
<path d="M46.9 229.2 L49.8 228.4 L52.7 228.1 L55.6 227.0 L58.5 226.0 L61.4 225.0 L64.3 225.1 L67.2 223.8 L70.1 224.6 L73.0 224.7 L75.9 225.9 L78.8 223.2 L81.7 223.3 L84.6 220.2 L87.5 219.6 L90.4 213.7 L93.3 212.8 L96.2 211.6 L99.1 210.8 L102.0 205.1 L104.9 205.1 L107.8 209.6 L110.7 204.5 L113.6 208.4 L116.5 204.8 L119.4 197.9 L122.3 201.4 L125.2 195.4 L128.1 199.8 L131.0 206.0 L133.9 213.0 L136.8 209.9 L139.7 202.4 L142.6 199.8 L145.5 202.1 L148.4 202.7 L151.3 196.8 L154.2 191.5 L157.1 187.4 L160.0 186.5 L162.9 191.8 L165.8 186.1 L168.7 185.7 L171.6 184.1 L174.5 182.2 L177.4 189.4 L180.3 179.1 L183.2 183.2 L186.1 178.2 L189.0 188.9 L191.9 182.7 L194.8 182.8 L197.7 181.2 L200.6 197.3 L203.5 185.9 L206.4 190.7 L209.3 166.1 L212.2 170.6 L215.1 153.9 L218.0 160.0 L220.9 170.0 L223.8 177.8 L226.7 155.6 L229.6 177.6 L232.5 164.6 L235.4 168.6 L238.3 165.8 L241.2 166.2 L244.1 184.5 L247.0 176.5 L249.9 159.4 L252.8 157.0 L255.7 170.2 L258.6 164.5 L261.5 157.7 L264.4 152.7 L267.3 164.9 L270.2 157.5 L273.1 166.0 L276.0 162.0 L278.9 159.8 L281.8 157.4 L284.7 132.4 L287.6 158.9 L290.5 149.2 L293.4 144.9 L296.3 128.4 L299.2 141.9 L302.1 137.9 L305.0 128.8 L307.9 148.1 L310.8 148.9 L313.7 152.7 L316.6 152.6 L319.5 119.8 L322.4 145.7 L325.3 146.4 L328.2 115.0 L331.1 138.4 L334.0 148.6 L336.9 145.0 L339.8 134.0 L342.7 153.6 L345.6 144.8 L348.5 144.4 L351.4 145.3 L354.3 135.5 L357.2 148.8 L360.1 147.6 L363.0 172.7 L365.9 149.9 L368.8 140.4 L371.7 128.7 L374.6 157.0 L377.5 149.8 L380.4 143.3 L383.3 134.0 L386.2 143.5 L389.1 143.9 L392.0 137.6 L394.9 130.0 L397.8 139.4 L400.7 137.6 L403.6 89.4 L406.5 144.2 L409.4 139.0 L412.3 130.1 L415.2 134.8 L418.1 113.2 L421.0 129.7 L423.9 125.5 L426.8 126.7 L429.7 144.4 L432.6 146.1 L435.5 138.5 L438.4 148.8 L441.3 114.2 L444.2 128.3 L447.1 112.0 L450.0 120.0 L452.9 132.1 L455.8 139.4 L458.7 136.5 L461.6 124.3 L464.5 114.1 L467.4 122.6 L470.3 148.0 L473.2 132.8 L476.1 146.5 L479.0 129.0 L481.9 158.7 L484.8 135.1 L487.7 151.0 L490.6 128.0 L493.5 112.1 L496.4 143.7 L499.3 127.4 L502.2 130.6 L505.1 135.3 L508.0 119.8 L510.9 120.9 L513.8 147.7 L516.7 144.4 L519.6 125.2 L522.5 125.8 L525.4 135.9 L528.3 125.7 L531.2 116.0 L534.1 127.8 L537.0 118.8 L539.9 124.7 L542.8 118.4 L545.7 100.6 L548.6 112.0 L551.5 113.0 L554.4 147.5 L557.3 145.2 L560.2 103.8 L563.1 130.6 L566.0 135.8 L568.9 113.9 L571.8 139.0 L574.7 137.3 L577.6 142.8 L580.5 123.8 L583.4 128.5 L586.3 119.6 L589.2 99.3 L592.1 116.0 L595.0 122.7 L597.9 145.0 L600.8 126.8 L603.7 103.2 L606.6 105.3 L609.5 98.4 L612.4 115.4 L615.3 100.4 L618.2 126.9 L621.1 107.3 L624.0 120.1" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 1, batch average</title></path>
<path d="M46.9 227.9 L49.8 221.5 L52.7 219.3 L55.6 212.1 L58.5 216.0 L61.4 222.1 L64.3 220.3 L67.2 191.8 L70.1 218.3 L73.0 220.1 L75.9 219.7 L78.8 219.6 L81.7 194.6 L84.6 205.4 L87.5 164.3 L90.4 191.4 L93.3 187.9 L96.2 145.2 L99.1 164.6 L102.0 151.8 L104.9 167.9 L107.8 156.2 L110.7 181.7 L113.6 183.5 L116.5 148.2 L119.4 161.0 L122.3 191.2 L125.2 138.7 L128.1 143.0 L131.0 137.5 L133.9 141.5 L136.8 134.2 L139.7 146.8 L142.6 141.6 L145.5 140.9 L148.4 150.4 L151.3 144.2 L154.2 127.4 L157.1 137.9 L160.0 135.7 L162.9 135.2 L165.8 148.2 L168.7 135.9 L171.6 124.4 L174.5 139.1 L177.4 138.7 L180.3 123.2 L183.2 130.8 L186.1 129.3 L189.0 135.6 L191.9 127.3 L194.8 123.5 L197.7 125.7 L200.6 161.7 L203.5 134.4 L206.4 144.3 L209.3 132.9 L212.2 130.6 L215.1 135.6 L218.0 133.7 L220.9 131.3 L223.8 135.0 L226.7 131.9 L229.6 131.9 L232.5 131.2 L235.4 128.2 L238.3 131.0 L241.2 114.5 L244.1 135.4 L247.0 122.6 L249.9 129.9 L252.8 161.8 L255.7 109.4 L258.6 133.5 L261.5 132.0 L264.4 134.7 L267.3 129.3 L270.2 126.7 L273.1 130.3 L276.0 132.0 L278.9 131.7 L281.8 130.7 L284.7 116.7 L287.6 112.8 L290.5 108.8 L293.4 133.0 L296.3 120.4 L299.2 127.5 L302.1 88.2 L305.0 111.2 L307.9 129.2 L310.8 118.2 L313.7 123.3 L316.6 85.0 L319.5 119.4 L322.4 118.7 L325.3 128.0 L328.2 135.1 L331.1 127.6 L334.0 86.9 L336.9 113.5 L339.8 99.8 L342.7 114.5 L345.6 135.8 L348.5 116.9 L351.4 134.6 L354.3 112.4 L357.2 119.9 L360.1 128.9 L363.0 123.2 L365.9 113.9 L368.8 107.1 L371.7 125.0 L374.6 116.0 L377.5 105.6 L380.4 85.1 L383.3 108.5 L386.2 116.3 L389.1 112.2 L392.0 105.5 L394.9 114.5 L397.8 126.7 L400.7 122.1 L403.6 119.8 L406.5 113.8 L409.4 98.7 L412.3 123.1 L415.2 106.3 L418.1 111.4 L421.0 125.8 L423.9 103.2 L426.8 82.0 L429.7 109.2 L432.6 98.1 L435.5 112.5 L438.4 103.9 L441.3 105.5 L444.2 105.0 L447.1 110.6 L450.0 106.7 L452.9 91.6 L455.8 116.8 L458.7 108.1 L461.6 108.6 L464.5 81.9 L467.4 101.9 L470.3 114.2 L473.2 133.3 L476.1 103.2 L479.0 95.5 L481.9 115.9 L484.8 117.4 L487.7 99.9 L490.6 107.3 L493.5 111.7 L496.4 107.1 L499.3 105.5 L502.2 117.8 L505.1 115.9 L508.0 78.6 L510.9 106.3 L513.8 122.1 L516.7 91.9 L519.6 115.2 L522.5 101.7 L525.4 83.3 L528.3 123.6 L531.2 67.7 L534.1 113.9 L537.0 112.4 L539.9 115.8 L542.8 106.4 L545.7 75.4 L548.6 78.6 L551.5 75.3 L554.4 119.6 L557.3 101.6 L560.2 90.8 L563.1 89.3 L566.0 113.9 L568.9 91.3 L571.8 60.5 L574.7 82.0 L577.6 76.0 L580.5 109.2 L583.4 94.5 L586.3 94.1 L589.2 65.5 L592.1 67.3 L595.0 91.5 L597.9 99.9 L600.8 67.5 L603.7 75.0 L606.6 48.1 L609.5 95.5 L612.4 70.2 L615.3 56.9 L618.2 79.4 L621.1 48.2 L624.0 82.3" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 2, best dog</title></path>
<path d="M46.9 229.5 L49.8 228.8 L52.7 228.2 L55.6 227.1 L58.5 227.8 L61.4 227.1 L64.3 228.0 L67.2 226.1 L70.1 227.4 L73.0 227.6 L75.9 226.4 L78.8 226.5 L81.7 224.7 L84.6 224.4 L87.5 223.9 L90.4 224.2 L93.3 224.7 L96.2 222.1 L99.1 224.4 L102.0 222.0 L104.9 220.4 L107.8 218.7 L110.7 222.1 L113.6 223.2 L116.5 218.4 L119.4 220.0 L122.3 222.8 L125.2 218.0 L128.1 218.1 L131.0 212.0 L133.9 218.0 L136.8 214.2 L139.7 210.3 L142.6 207.4 L145.5 202.9 L148.4 216.3 L151.3 212.4 L154.2 196.1 L157.1 207.8 L160.0 210.9 L162.9 198.0 L165.8 206.7 L168.7 200.4 L171.6 196.4 L174.5 211.4 L177.4 198.6 L180.3 191.4 L183.2 200.1 L186.1 188.7 L189.0 204.0 L191.9 199.4 L194.8 199.0 L197.7 198.6 L200.6 217.2 L203.5 188.3 L206.4 204.9 L209.3 196.4 L212.2 204.8 L215.1 194.4 L218.0 198.1 L220.9 188.3 L223.8 182.1 L226.7 191.0 L229.6 190.0 L232.5 180.0 L235.4 189.8 L238.3 193.1 L241.2 175.0 L244.1 196.9 L247.0 191.7 L249.9 200.0 L252.8 198.9 L255.7 192.0 L258.6 204.7 L261.5 188.4 L264.4 188.3 L267.3 167.6 L270.2 186.2 L273.1 185.6 L276.0 186.9 L278.9 187.3 L281.8 200.4 L284.7 174.1 L287.6 183.1 L290.5 178.9 L293.4 198.2 L296.3 182.4 L299.2 197.7 L302.1 182.8 L305.0 180.2 L307.9 173.9 L310.8 187.6 L313.7 189.9 L316.6 175.0 L319.5 183.3 L322.4 183.7 L325.3 179.6 L328.2 191.5 L331.1 186.6 L334.0 160.1 L336.9 157.4 L339.8 176.9 L342.7 170.6 L345.6 170.1 L348.5 161.3 L351.4 180.5 L354.3 164.5 L357.2 173.1 L360.1 178.9 L363.0 180.3 L365.9 168.3 L368.8 168.3 L371.7 176.7 L374.6 178.3 L377.5 182.1 L380.4 170.6 L383.3 170.0 L386.2 163.6 L389.1 163.4 L392.0 146.3 L394.9 158.5 L397.8 168.5 L400.7 179.3 L403.6 172.2 L406.5 176.5 L409.4 161.5 L412.3 165.9 L415.2 169.0 L418.1 169.7 L421.0 177.4 L423.9 160.4 L426.8 148.4 L429.7 172.0 L432.6 177.0 L435.5 163.2 L438.4 170.2 L441.3 165.7 L444.2 157.6 L447.1 163.2 L450.0 164.3 L452.9 153.4 L455.8 155.2 L458.7 155.0 L461.6 168.7 L464.5 159.7 L467.4 167.0 L470.3 178.3 L473.2 174.5 L476.1 182.0 L479.0 157.6 L481.9 163.8 L484.8 165.9 L487.7 156.1 L490.6 151.0 L493.5 167.9 L496.4 171.1 L499.3 160.5 L502.2 177.7 L505.1 165.5 L508.0 145.2 L510.9 147.8 L513.8 156.8 L516.7 157.3 L519.6 155.9 L522.5 155.2 L525.4 147.1 L528.3 149.7 L531.2 131.9 L534.1 170.0 L537.0 151.9 L539.9 159.0 L542.8 152.3 L545.7 139.1 L548.6 151.2 L551.5 151.5 L554.4 158.6 L557.3 155.1 L560.2 135.6 L563.1 137.9 L566.0 148.8 L568.9 139.9 L571.8 146.4 L574.7 145.7 L577.6 138.7 L580.5 157.4 L583.4 160.7 L586.3 158.1 L589.2 122.9 L592.1 133.4 L595.0 146.9 L597.9 148.7 L600.8 144.7 L603.7 141.3 L606.6 129.6 L609.5 147.7 L612.4 131.5 L615.3 129.6 L618.2 128.6 L621.1 138.0 L624.0 147.0" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 2, batch average</title></path>
<path d="M46.9 227.2 L49.8 221.5 L52.7 217.8 L55.6 211.1 L58.5 220.6 L61.4 216.3 L64.3 189.3 L67.2 217.6 L70.1 206.4 L73.0 174.9 L75.9 179.2 L78.8 184.4 L81.7 182.4 L84.6 192.3 L87.5 198.9 L90.4 144.3 L93.3 216.1 L96.2 145.3 L99.1 137.2 L102.0 120.5 L104.9 136.5 L107.8 139.7 L110.7 120.2 L113.6 165.9 L116.5 129.7 L119.4 133.6 L122.3 155.9 L125.2 135.0 L128.1 132.9 L131.0 132.1 L133.9 132.8 L136.8 119.5 L139.7 138.2 L142.6 136.7 L145.5 139.8 L148.4 142.6 L151.3 132.5 L154.2 130.9 L157.1 132.1 L160.0 132.5 L162.9 132.7 L165.8 132.1 L168.7 134.0 L171.6 133.7 L174.5 128.1 L177.4 134.7 L180.3 134.1 L183.2 132.1 L186.1 131.9 L189.0 133.3 L191.9 126.9 L194.8 132.1 L197.7 127.3 L200.6 134.0 L203.5 119.5 L206.4 133.4 L209.3 128.7 L212.2 130.9 L215.1 130.9 L218.0 131.6 L220.9 132.5 L223.8 131.9 L226.7 114.9 L229.6 122.3 L232.5 126.4 L235.4 126.6 L238.3 107.1 L241.2 113.2 L244.1 133.0 L247.0 119.7 L249.9 118.1 L252.8 127.8 L255.7 123.5 L258.6 129.7 L261.5 128.3 L264.4 130.4 L267.3 126.0 L270.2 82.4 L273.1 127.8 L276.0 128.5 L278.9 134.2 L281.8 135.1 L284.7 129.0 L287.6 134.2 L290.5 125.0 L293.4 133.6 L296.3 130.5 L299.2 133.4 L302.1 110.1 L305.0 120.7 L307.9 135.2 L310.8 118.6 L313.7 118.2 L316.6 117.9 L319.5 90.5 L322.4 114.4 L325.3 111.5 L328.2 139.9 L331.1 130.9 L334.0 134.1 L336.9 120.3 L339.8 108.6 L342.7 99.7 L345.6 125.1 L348.5 121.3 L351.4 133.3 L354.3 127.0 L357.2 110.5 L360.1 123.4 L363.0 116.0 L365.9 133.4 L368.8 128.2 L371.7 116.1 L374.6 125.1 L377.5 119.9 L380.4 96.5 L383.3 114.5 L386.2 121.0 L389.1 110.8 L392.0 112.6 L394.9 116.4 L397.8 129.8 L400.7 127.2 L403.6 117.2 L406.5 115.3 L409.4 109.5 L412.3 130.7 L415.2 102.7 L418.1 121.0 L421.0 114.1 L423.9 113.0 L426.8 99.6 L429.7 98.5 L432.6 119.0 L435.5 88.5 L438.4 127.4 L441.3 116.6 L444.2 96.7 L447.1 129.3 L450.0 109.3 L452.9 99.2 L455.8 115.5 L458.7 114.4 L461.6 128.6 L464.5 102.0 L467.4 109.3 L470.3 114.1 L473.2 115.9 L476.1 110.3 L479.0 97.7 L481.9 131.5 L484.8 118.5 L487.7 131.0 L490.6 126.3 L493.5 88.4 L496.4 125.9 L499.3 132.4 L502.2 106.2 L505.1 121.6 L508.0 85.3 L510.9 118.0 L513.8 131.1 L516.7 97.0 L519.6 86.6 L522.5 86.3 L525.4 87.6 L528.3 109.8 L531.2 56.6 L534.1 115.0 L537.0 108.1 L539.9 111.0 L542.8 123.8 L545.7 89.2 L548.6 109.6 L551.5 102.1 L554.4 106.8 L557.3 97.7 L560.2 100.0 L563.1 129.1 L566.0 131.1 L568.9 131.2 L571.8 113.1 L574.7 96.8 L577.6 95.2 L580.5 119.4 L583.4 123.0 L586.3 112.1 L589.2 81.1 L592.1 108.1 L595.0 99.8 L597.9 94.0 L600.8 90.0 L603.7 107.1 L606.6 85.2 L609.5 110.2 L612.4 88.8 L615.3 75.0 L618.2 89.4 L621.1 96.4 L624.0 91.6" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 3, best dog</title></path>
<path d="M46.9 229.4 L49.8 228.5 L52.7 228.4 L55.6 227.4 L58.5 227.8 L61.4 227.3 L64.3 227.5 L67.2 227.6 L70.1 227.6 L73.0 225.6 L75.9 226.4 L78.8 226.2 L81.7 221.9 L84.6 225.5 L87.5 225.7 L90.4 221.5 L93.3 225.9 L96.2 220.5 L99.1 216.9 L102.0 217.9 L104.9 213.7 L107.8 213.9 L110.7 209.0 L113.6 221.5 L116.5 205.5 L119.4 210.3 L122.3 210.3 L125.2 203.9 L128.1 204.3 L131.0 200.3 L133.9 207.5 L136.8 202.0 L139.7 209.7 L142.6 210.2 L145.5 205.9 L148.4 212.3 L151.3 195.7 L154.2 201.3 L157.1 200.9 L160.0 193.6 L162.9 198.4 L165.8 196.1 L168.7 196.9 L171.6 185.3 L174.5 186.3 L177.4 187.2 L180.3 189.6 L183.2 194.7 L186.1 186.5 L189.0 193.4 L191.9 181.1 L194.8 192.6 L197.7 190.8 L200.6 184.7 L203.5 181.2 L206.4 193.3 L209.3 179.2 L212.2 181.2 L215.1 187.9 L218.0 174.4 L220.9 182.5 L223.8 182.0 L226.7 176.8 L229.6 183.3 L232.5 182.7 L235.4 185.6 L238.3 179.3 L241.2 172.0 L244.1 186.8 L247.0 182.1 L249.9 181.6 L252.8 197.4 L255.7 182.7 L258.6 195.4 L261.5 183.3 L264.4 175.1 L267.3 183.4 L270.2 189.6 L273.1 192.9 L276.0 185.3 L278.9 191.9 L281.8 188.7 L284.7 190.7 L287.6 186.0 L290.5 169.8 L293.4 180.1 L296.3 169.3 L299.2 194.2 L302.1 176.8 L305.0 180.6 L307.9 193.6 L310.8 180.3 L313.7 157.2 L316.6 152.6 L319.5 164.3 L322.4 163.1 L325.3 175.2 L328.2 197.2 L331.1 171.3 L334.0 180.1 L336.9 179.1 L339.8 175.6 L342.7 172.9 L345.6 161.7 L348.5 153.4 L351.4 171.1 L354.3 166.6 L357.2 151.4 L360.1 167.2 L363.0 163.1 L365.9 171.3 L368.8 163.3 L371.7 161.5 L374.6 158.7 L377.5 166.9 L380.4 164.5 L383.3 164.3 L386.2 168.4 L389.1 162.1 L392.0 166.1 L394.9 161.4 L397.8 175.3 L400.7 181.0 L403.6 162.8 L406.5 169.0 L409.4 165.1 L412.3 160.3 L415.2 151.8 L418.1 160.4 L421.0 161.5 L423.9 164.5 L426.8 165.7 L429.7 171.7 L432.6 172.7 L435.5 159.3 L438.4 166.8 L441.3 161.1 L444.2 151.8 L447.1 180.0 L450.0 178.7 L452.9 158.4 L455.8 166.6 L458.7 176.7 L461.6 166.6 L464.5 162.5 L467.4 168.1 L470.3 150.0 L473.2 152.8 L476.1 165.8 L479.0 142.1 L481.9 176.7 L484.8 159.5 L487.7 155.4 L490.6 149.9 L493.5 150.0 L496.4 173.9 L499.3 159.7 L502.2 175.4 L505.1 156.1 L508.0 137.6 L510.9 151.0 L513.8 174.5 L516.7 160.5 L519.6 151.0 L522.5 157.4 L525.4 153.2 L528.3 168.1 L531.2 144.2 L534.1 165.1 L537.0 156.9 L539.9 161.4 L542.8 163.9 L545.7 140.7 L548.6 153.9 L551.5 147.0 L554.4 152.5 L557.3 159.6 L560.2 150.1 L563.1 160.9 L566.0 155.8 L568.9 171.3 L571.8 162.3 L574.7 153.2 L577.6 139.0 L580.5 154.1 L583.4 147.8 L586.3 164.7 L589.2 139.5 L592.1 145.7 L595.0 153.4 L597.9 151.8 L600.8 161.4 L603.7 171.4 L606.6 149.1 L609.5 156.1 L612.4 147.0 L615.3 155.8 L618.2 144.9 L621.1 153.2 L624.0 160.6" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 3, batch average</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog (one line per run)</span><span><i style="background:#c97c12"></i>batch average</span></div>
<figcaption>Score by generation for the three batches evolved on the awkward flock (with old ewes, at this stage) and the obstacle field, turn and turn about. Slower and noisier than the open field, because every generation gets a different pair of flocks.</figcaption>
</figure>

Three batches of two hundred generations on the awkward flock and the obstacle field, turn and turn about. They got to a full pen at generations 64, 168 and 182, which is slower going than the open field, and the batch average never got near the best dog, because every generation gets a different pair of flocks and a dog that's good on one awkward flock is often bad on the next. The champion penned 21 of 30 unseen flocks, median 15.2 seconds.

The retrained dog is a different dog, and switching its inputs off shows it:

<!-- TABLE:ablation-farm -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>switched off (retrained dog, on its own two fields)</th><th class="num">score</th><th class="num">penned all</th></tr></thead>
<tbody>
<tr><td>nothing (the dog as evolved)</td><td class="num">1.90</td><td class="num">28 / 30</td></tr>
<tr><td>nearest sheep, how far</td><td class="num">0.12</td><td class="num">0 / 30</td></tr>
<tr><td>flock centre</td><td class="num">0.38</td><td class="num">4 / 30</td></tr>
<tr><td>flock to pen</td><td class="num">0.79</td><td class="num">10 / 30</td></tr>
<tr><td>nearest sheep, where</td><td class="num">1.48</td><td class="num">23 / 30</td></tr>
<tr><td>nearest sheep speed</td><td class="num">1.65</td><td class="num">22 / 30</td></tr>
<tr><td>flock speed</td><td class="num">1.66</td><td class="num">22 / 30</td></tr>
<tr><td>how spread out</td><td class="num">1.79</td><td class="num">25 / 30</td></tr>
<tr><td>furthest sheep</td><td class="num">1.88</td><td class="num">28 / 30</td></tr>
<tr><td>share still loose</td><td class="num">1.92</td><td class="num">29 / 30</td></tr>
<tr><td>nearest obstacle</td><td class="num">1.95</td><td class="num">29 / 30</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The open-field dog used one input. This one uses four or five. It's useless without the nearest sheep's distance, like the first dog, but now it also can't manage without the flock centre or which way the pen is, because on the obstacle field the way to the pen isn't always straight ahead, and it drops a fair bit without either of the speed inputs, which the first dog didn't need. What it still doesn't use is the furthest sheep, which is the paper's collect rule, or the obstacle inputs, which I put in for the pond and the wall. It gets round the obstacles the same way the first dog does, by letting the sheep flow round them and following. It's a dog that has to look at more things because the field asks more questions, but it still isn't looking at the things I'd have told it to.

### Reading its mind in the paper's words

For each dog, the share of the run its heading pointed at the paper's COLLECT spot, at the paper's DRIVE spot, or at neither:

<!-- TABLE:thoughts -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>dog, field</th><th class="num">DRIVE</th><th class="num">COLLECT</th><th class="num">neither</th></tr></thead>
<tbody>
<tr><td>the paper's dog, open field</td><td class="num">51%</td><td class="num">48%</td><td class="num">1%</td></tr>
<tr><td>my collie, open field</td><td class="num">50%</td><td class="num">36%</td><td class="num">14%</td></tr>
<tr><td>robot collie (open field), open field</td><td class="num">38%</td><td class="num">30%</td><td class="num">32%</td></tr>
<tr><td>robot collie (open field), awkward flock</td><td class="num">30%</td><td class="num">24%</td><td class="num">45%</td></tr>
<tr><td>robot collie (retrained), obstacle field</td><td class="num">25%</td><td class="num">24%</td><td class="num">51%</td></tr>
<tr><td>robot collie (retrained), awkward flock</td><td class="num">25%</td><td class="num">28%</td><td class="num">47%</td></tr>
<tr><td>robot collie (best), awkward flock</td><td class="num">31%</td><td class="num">29%</td><td class="num">39%</td></tr>
<tr><td>robot collie (best), the farm</td><td class="num">29%</td><td class="num">27%</td><td class="num">43%</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The paper's dog reads as one of its own two rules 99% of the time, which is the check that the reading works, and my collie reads as "neither" for the 14% of the run it spends flanking round the back, which is what I added. The open-field robot is "neither" for a third of the run on its own field, and for two thirds of it on the awkward flock, where it's mostly standing off a flock that won't move. The retrained dog is "neither" about half the time on both its fields, and the rest is split evenly between the two rules. It isn't doing the paper's dog's job in the paper's dog's order; it's doing something of its own that overlaps with both. I expected to find the two rules in there, and what I found is that the two rules describe about half of what this dog does.

### Things I'd want to check

- Three batches per dog is enough to see that they don't all get there at the same speed and not enough to say how often one gets stuck. On the open field the three batches took 2, 17 and 114 generations to their first full pen.
- The inputs are mine, and the dog can only build rules out of what I gave it. The obstacle input doubling as a bias on the open field is a good example of the dog finding a use for something I didn't intend.
- "Reads as DRIVE" is my definition: the heading within about 45 degrees of the spot the paper's dog would run to. A wider cone would move all the percentages up together.
- The score rewards speed on a 40 second limit, and the worst-case times show what that buys.
- The turning limit went in after the dogs were evolved, not before, because the spinning only showed up when I watched them on the harder fields. It made both dogs better as it happens. I did then evolve both dogs again with it in from the start, and got the same dogs back to within a flock or two, so it isn't hiding anything.
- The old ewes came out after the dogs were evolved too. The retrained dog was trained with them in, and all the numbers above are without them. With them in, the retrained dog gets 37 of 60 awkward flocks instead of 57, because a ewe standing near the dog is the nearest sheep, and this dog's rule is about the nearest sheep.
- More generations on the same fields didn't help the retrained dog: I tried that on an earlier version of it and got almost nothing for half an hour of compute. What did help was more fields, which is the last section.
- The best dog had the farm in its training and the other two didn't, so the farm column isn't a fair comparison between the dogs; it's a comparison between the best dog and my collie, which is the one I care about.
- All timings are one machine, unoptimised JavaScript, and only matter as a rough idea of what an afternoon is.

## How to make it the best dog

Everything above was the honest first attempt. Then I gave myself an hour of compute and a free hand to make the best dog I could, without changing what a dog is. Three things:

- **Two more things to see.** The sheep left furthest behind (measured against the direction to the pen, which is the leader problem seen from the dog's side), and which way the flock is drifting, not just how fast. That's twenty-one inputs.
- **All four fields at once.** Every generation gets one flock on each of the open field, the awkward flock, the obstacle field and the farm, so one dog has to do everything instead of two dogs doing one thing each.
- **Start from the retrained dog, not from scratch.** Its brain is copied in with the new inputs wired to zero, so it begins exactly as good as it was and can only build on it. That's what makes it fit in an hour: three batches of a hundred and fifty generations, and no time spent rediscovering how to get behind a flock.

It worked, and it's the first robot dog in this post that I'd call better than mine. On the open field it's the fastest dog of the lot, my collie included, with a median of 10.7 seconds. On the awkward flock it pens 59 out of 60 and is quicker than my collie on the median. On the obstacle field it's quicker than my collie and its worst case is seven seconds better. And on the farm it goes from 39 full pens in 60 to 52, with 55 of the 60 sheep in on average, where my collie gets all 60 but takes about the same time. So: one dog, four fields, better than the hand-written collie on three of them and behind it on the fourth.

<details class="demo-box">
<summary><span class="demo-title">The best dog on the awkward flock</span><span class="demo-desc">Against the retrained dog and my collie. Leaders, loners and flighty sheep.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="awkward" data-brain="best">
  <canvas aria-label="Sheepdog simulation: the best robot collie on a flock with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:best" data-name="the best dog">Watch the best dog</button>
    <button type="button" data-mode="brain:farm" data-name="the retrained dog">Watch the retrained dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Best dog <b data-time="brain:best">–</b></span>
    <span>Retrained dog <b data-time="brain:farm">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>
</details>

<details class="demo-box">
<summary><span class="demo-title">The best dog on the farm</span><span class="demo-desc">Sixty awkward sheep and all the obstacles, which this dog has now trained on.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="farm2" data-brain="best">
  <canvas aria-label="Sheepdog simulation: the best robot collie on the full farm"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 60 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:best" data-name="the best dog">Watch the best dog</button>
    <button type="button" data-mode="brain:farm" data-name="the retrained dog">Watch the retrained dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Best dog <b data-time="brain:best">–</b></span>
    <span>Retrained dog <b data-time="brain:farm">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>
</details>

<details class="demo-box">
<summary><span class="demo-title">The best dog on the open field</span><span class="demo-desc">Back where it started, against the open-field specialist and the paper's dog.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="paper" data-brain="best" data-collie-name="the paper's dog">
  <canvas aria-label="Sheepdog simulation: the best robot collie on the open field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:best" data-name="the best dog">Watch the best dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="the paper's dog">Watch the paper's dog</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Best dog <b data-time="brain:best">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>Paper's dog <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>
</details>

### The best dog's numbers

<!-- TABLE:best -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>field</th><th class="num">best dog penned all</th><th class="num">sheep in, average</th><th class="num">best dog median</th><th class="num">my collie penned all</th><th class="num">my collie median</th></tr></thead>
<tbody>
<tr><td>open field (30)</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">10.7s</td><td class="num">60 / 60</td><td class="num">12.5s</td></tr>
<tr><td>awkward flock (36)</td><td class="num">59 / 60</td><td class="num">35.5</td><td class="num">15.8s</td><td class="num">60 / 60</td><td class="num">17.7s</td></tr>
<tr><td>pond, wall and trees (30)</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">13.3s</td><td class="num">60 / 60</td><td class="num">14.1s</td></tr>
<tr><td>the farm (60)</td><td class="num">52 / 60</td><td class="num">55.5</td><td class="num">31.5s</td><td class="num">60 / 60</td><td class="num">27.9s</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The champion was picked the same way as the others, on thirty flocks none of the finalists had seen, spread across the four fields: it penned all thirty. Head to head with the open-field specialist on the open field it's about level, 31 flocks to 29, which is the specialist's own ground; everywhere else it wins comfortably.

The bit I didn't expect is in the next table. I gave it two new things to see, the sheep left furthest behind and which way the flock is drifting, because those looked like what it was missing at the mouth of the pen. It ignores both. Switch off the sheep-left-behind input and it does very slightly *better*. Switch off the drift and nothing happens. Everything it gained came from the other two changes: being trained on all four fields at once, and starting from a dog that already worked instead of from random weights. I'd have bet on the inputs.

<figure class="robot-figure" data-chart="learning-best">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Score of the best dog and of the batch average, by generation, for each run (all four fields)" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Score of the best dog and of the batch average, by generation, for each run (all four fields)</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.14)"/><text x="36" y="142.6" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<line x1="44" x2="624" y1="45.2" y2="45.2" stroke="rgba(255,255,255,0.14)"/><text x="36" y="45.2" fill="#8490b5" text-anchor="end" dominant-baseline="middle">2</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="430.7" y="258" fill="#8490b5" text-anchor="middle">100</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">150</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">score (1 = every sheep in)</text>
<path d="M47.9 35.1 L51.7 34.3 L55.6 38.4 L59.5 30.6 L63.3 33.4 L67.2 34.9 L71.1 35.1 L74.9 36.5 L78.8 32.9 L82.7 33.3 L86.5 33.1 L90.4 35.0 L94.3 33.5 L98.1 34.4 L102.0 35.2 L105.9 32.2 L109.7 30.7 L113.6 34.0 L117.5 30.8 L121.3 32.2 L125.2 33.4 L129.1 33.8 L132.9 36.7 L136.8 36.6 L140.7 33.2 L144.5 30.2 L148.4 32.9 L152.3 37.5 L156.1 32.7 L160.0 38.0 L163.9 32.6 L167.7 32.7 L171.6 36.7 L175.5 31.1 L179.3 33.2 L183.2 32.6 L187.1 37.1 L190.9 33.9 L194.8 36.8 L198.7 35.1 L202.5 33.8 L206.4 33.0 L210.3 31.2 L214.1 35.8 L218.0 32.8 L221.9 32.2 L225.7 31.5 L229.6 33.7 L233.5 35.9 L237.3 30.9 L241.2 31.4 L245.1 31.1 L248.9 35.8 L252.8 35.5 L256.7 29.8 L260.5 31.4 L264.4 35.0 L268.3 31.2 L272.1 31.7 L276.0 34.1 L279.9 35.5 L283.7 36.6 L287.6 31.9 L291.5 33.3 L295.3 36.5 L299.2 35.2 L303.1 32.1 L306.9 35.0 L310.8 35.6 L314.7 33.4 L318.5 34.9 L322.4 29.8 L326.3 33.5 L330.1 33.7 L334.0 36.0 L337.9 32.2 L341.7 34.7 L345.6 32.2 L349.5 35.3 L353.3 32.5 L357.2 34.5 L361.1 31.9 L364.9 34.1 L368.8 36.5 L372.7 30.2 L376.5 29.7 L380.4 32.6 L384.3 35.2 L388.1 34.8 L392.0 30.6 L395.9 30.7 L399.7 31.9 L403.6 34.3 L407.5 36.4 L411.3 31.1 L415.2 34.5 L419.1 30.6 L422.9 33.1 L426.8 34.0 L430.7 36.0 L434.5 36.2 L438.4 32.7 L442.3 30.5 L446.1 32.6 L450.0 34.3 L453.9 32.2 L457.7 33.7 L461.6 33.9 L465.5 33.1 L469.3 34.4 L473.2 35.8 L477.1 35.4 L480.9 33.6 L484.8 32.9 L488.7 31.2 L492.5 33.4 L496.4 30.7 L500.3 33.0 L504.1 34.1 L508.0 31.6 L511.9 33.6 L515.7 32.1 L519.6 29.7 L523.5 32.3 L527.3 29.5 L531.2 32.8 L535.1 31.7 L538.9 35.6 L542.8 30.6 L546.7 31.5 L550.5 33.4 L554.4 35.9 L558.3 29.7 L562.1 33.0 L566.0 30.8 L569.9 34.2 L573.7 35.1 L577.6 31.2 L581.5 34.2 L585.3 31.8 L589.2 30.3 L593.1 39.0 L596.9 31.6 L600.8 32.8 L604.7 32.7 L608.5 34.8 L612.4 32.9 L616.3 30.1 L620.1 30.8 L624.0 33.4" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 1, best dog</title></path>
<path d="M47.9 51.3 L51.7 69.1 L55.6 78.4 L59.5 48.9 L63.3 67.1 L67.2 69.6 L71.1 66.3 L74.9 80.6 L78.8 59.8 L82.7 78.8 L86.5 69.6 L90.4 74.0 L94.3 64.3 L98.1 60.3 L102.0 79.2 L105.9 57.7 L109.7 61.0 L113.6 58.4 L117.5 57.7 L121.3 65.7 L125.2 58.0 L129.1 59.9 L132.9 74.0 L136.8 69.0 L140.7 56.5 L144.5 42.4 L148.4 60.1 L152.3 70.4 L156.1 54.1 L160.0 74.0 L163.9 54.4 L167.7 47.8 L171.6 64.0 L175.5 52.7 L179.3 57.3 L183.2 56.5 L187.1 70.8 L190.9 63.6 L194.8 72.9 L198.7 59.4 L202.5 53.2 L206.4 56.4 L210.3 39.9 L214.1 72.7 L218.0 50.0 L221.9 55.6 L225.7 39.3 L229.6 45.0 L233.5 70.1 L237.3 41.2 L241.2 48.2 L245.1 47.9 L248.9 57.1 L252.8 81.4 L256.7 39.7 L260.5 38.2 L264.4 63.9 L268.3 46.1 L272.1 56.4 L276.0 53.4 L279.9 59.5 L283.7 60.0 L287.6 42.3 L291.5 46.7 L295.3 56.0 L299.2 50.3 L303.1 46.8 L306.9 49.0 L310.8 66.7 L314.7 46.6 L318.5 44.0 L322.4 38.6 L326.3 42.3 L330.1 47.6 L334.0 55.7 L337.9 43.8 L341.7 52.6 L345.6 42.5 L349.5 47.1 L353.3 51.8 L357.2 61.2 L361.1 42.4 L364.9 55.2 L368.8 57.6 L372.7 40.9 L376.5 39.0 L380.4 45.8 L384.3 49.2 L388.1 49.8 L392.0 42.4 L395.9 42.1 L399.7 48.2 L403.6 45.9 L407.5 54.2 L411.3 43.3 L415.2 57.4 L419.1 45.2 L422.9 49.3 L426.8 54.4 L430.7 47.1 L434.5 59.8 L438.4 54.6 L442.3 52.4 L446.1 59.4 L450.0 55.3 L453.9 42.2 L457.7 47.6 L461.6 48.2 L465.5 45.2 L469.3 57.0 L473.2 43.4 L477.1 47.7 L480.9 47.3 L484.8 43.4 L488.7 46.2 L492.5 39.5 L496.4 36.9 L500.3 40.8 L504.1 41.8 L508.0 37.0 L511.9 55.5 L515.7 43.5 L519.6 35.1 L523.5 53.6 L527.3 39.0 L531.2 44.6 L535.1 41.0 L538.9 53.0 L542.8 41.7 L546.7 44.7 L550.5 44.1 L554.4 56.4 L558.3 39.7 L562.1 46.4 L566.0 48.1 L569.9 56.7 L573.7 54.1 L577.6 38.8 L581.5 44.4 L585.3 50.1 L589.2 34.0 L593.1 60.6 L596.9 43.7 L600.8 44.1 L604.7 40.2 L608.5 50.8 L612.4 43.8 L616.3 38.4 L620.1 38.8 L624.0 47.2" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 1, batch average</title></path>
<path d="M47.9 36.5 L51.7 36.3 L55.6 37.0 L59.5 30.0 L63.3 34.3 L67.2 36.0 L71.1 33.1 L74.9 36.2 L78.8 36.2 L82.7 33.7 L86.5 32.5 L90.4 35.5 L94.3 34.2 L98.1 31.9 L102.0 37.1 L105.9 31.4 L109.7 31.7 L113.6 34.3 L117.5 30.4 L121.3 34.6 L125.2 33.6 L129.1 34.1 L132.9 34.6 L136.8 38.4 L140.7 35.5 L144.5 31.1 L148.4 35.0 L152.3 34.2 L156.1 33.9 L160.0 35.8 L163.9 33.0 L167.7 32.1 L171.6 38.1 L175.5 31.8 L179.3 32.2 L183.2 32.3 L187.1 39.0 L190.9 33.8 L194.8 37.3 L198.7 36.3 L202.5 32.9 L206.4 33.6 L210.3 31.2 L214.1 34.5 L218.0 33.5 L221.9 35.2 L225.7 33.3 L229.6 34.2 L233.5 35.9 L237.3 31.2 L241.2 32.4 L245.1 31.3 L248.9 33.5 L252.8 37.5 L256.7 30.6 L260.5 31.6 L264.4 34.4 L268.3 32.0 L272.1 34.6 L276.0 33.0 L279.9 37.3 L283.7 38.2 L287.6 33.1 L291.5 35.0 L295.3 36.0 L299.2 34.8 L303.1 33.7 L306.9 34.9 L310.8 41.6 L314.7 32.3 L318.5 36.2 L322.4 29.6 L326.3 34.3 L330.1 33.2 L334.0 35.5 L337.9 32.9 L341.7 32.9 L345.6 33.2 L349.5 34.2 L353.3 33.3 L357.2 36.2 L361.1 32.3 L364.9 33.5 L368.8 38.2 L372.7 31.6 L376.5 29.2 L380.4 31.7 L384.3 33.4 L388.1 34.5 L392.0 30.8 L395.9 30.4 L399.7 32.8 L403.6 34.6 L407.5 35.6 L411.3 33.8 L415.2 34.5 L419.1 31.8 L422.9 31.4 L426.8 33.8 L430.7 35.3 L434.5 33.2 L438.4 33.1 L442.3 32.1 L446.1 32.4 L450.0 34.4 L453.9 31.6 L457.7 33.7 L461.6 33.8 L465.5 33.2 L469.3 34.1 L473.2 34.2 L477.1 34.1 L480.9 32.8 L484.8 33.4 L488.7 31.3 L492.5 32.7 L496.4 31.7 L500.3 31.8 L504.1 36.1 L508.0 33.1 L511.9 35.3 L515.7 32.5 L519.6 30.6 L523.5 31.3 L527.3 30.6 L531.2 33.9 L535.1 32.6 L538.9 35.9 L542.8 29.4 L546.7 30.7 L550.5 36.1 L554.4 36.6 L558.3 30.9 L562.1 30.6 L566.0 30.9 L569.9 33.7 L573.7 36.5 L577.6 31.8 L581.5 34.5 L585.3 33.3 L589.2 29.4 L593.1 34.2 L596.9 32.8 L600.8 31.4 L604.7 33.5 L608.5 36.3 L612.4 34.4 L616.3 32.5 L620.1 29.9 L624.0 33.6" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 2, best dog</title></path>
<path d="M47.9 56.7 L51.7 57.7 L55.6 83.5 L59.5 66.7 L63.3 58.6 L67.2 69.8 L71.1 69.8 L74.9 77.0 L78.8 63.7 L82.7 75.2 L86.5 63.3 L90.4 55.7 L94.3 55.9 L98.1 55.0 L102.0 76.4 L105.9 62.1 L109.7 53.1 L113.6 62.6 L117.5 52.0 L121.3 72.1 L125.2 76.8 L129.1 73.5 L132.9 87.4 L136.8 76.4 L140.7 56.0 L144.5 41.9 L148.4 62.2 L152.3 59.7 L156.1 52.2 L160.0 67.2 L163.9 48.7 L167.7 48.9 L171.6 64.8 L175.5 48.3 L179.3 49.7 L183.2 52.1 L187.1 70.7 L190.9 62.4 L194.8 66.8 L198.7 65.7 L202.5 57.4 L206.4 49.1 L210.3 35.2 L214.1 57.6 L218.0 53.6 L221.9 56.2 L225.7 44.1 L229.6 50.0 L233.5 61.6 L237.3 44.0 L241.2 40.8 L245.1 39.7 L248.9 58.4 L252.8 71.8 L256.7 40.9 L260.5 38.2 L264.4 60.1 L268.3 45.0 L272.1 63.4 L276.0 51.0 L279.9 61.4 L283.7 58.1 L287.6 47.3 L291.5 53.0 L295.3 50.8 L299.2 48.4 L303.1 42.2 L306.9 45.6 L310.8 71.0 L314.7 50.9 L318.5 50.3 L322.4 35.5 L326.3 43.6 L330.1 46.1 L334.0 61.3 L337.9 45.9 L341.7 51.2 L345.6 47.3 L349.5 47.9 L353.3 52.7 L357.2 58.9 L361.1 41.1 L364.9 46.7 L368.8 46.4 L372.7 37.0 L376.5 35.1 L380.4 42.4 L384.3 46.0 L388.1 45.9 L392.0 35.5 L395.9 36.4 L399.7 42.8 L403.6 49.5 L407.5 47.7 L411.3 41.6 L415.2 46.9 L419.1 37.8 L422.9 39.3 L426.8 44.2 L430.7 45.2 L434.5 42.0 L438.4 44.1 L442.3 40.7 L446.1 47.9 L450.0 48.3 L453.9 37.8 L457.7 45.1 L461.6 40.5 L465.5 41.0 L469.3 68.8 L473.2 45.4 L477.1 48.7 L480.9 43.2 L484.8 43.2 L488.7 39.8 L492.5 42.7 L496.4 37.2 L500.3 39.7 L504.1 42.7 L508.0 42.3 L511.9 48.9 L515.7 42.3 L519.6 35.2 L523.5 42.6 L527.3 40.3 L531.2 43.2 L535.1 38.3 L538.9 49.7 L542.8 36.2 L546.7 37.1 L550.5 48.4 L554.4 55.7 L558.3 37.1 L562.1 46.4 L566.0 40.2 L569.9 45.5 L573.7 56.7 L577.6 42.7 L581.5 47.0 L585.3 43.1 L589.2 34.0 L593.1 60.4 L596.9 44.6 L600.8 40.5 L604.7 40.7 L608.5 52.2 L612.4 45.0 L616.3 40.6 L620.1 37.8 L624.0 45.0" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 2, batch average</title></path>
<path d="M47.9 36.3 L51.7 34.6 L55.6 41.1 L59.5 30.9 L63.3 34.2 L67.2 35.9 L71.1 34.0 L74.9 39.1 L78.8 35.1 L82.7 32.9 L86.5 33.2 L90.4 35.1 L94.3 34.1 L98.1 32.5 L102.0 37.5 L105.9 31.9 L109.7 29.8 L113.6 31.9 L117.5 30.6 L121.3 31.3 L125.2 35.2 L129.1 36.2 L132.9 35.7 L136.8 39.3 L140.7 34.3 L144.5 30.7 L148.4 33.8 L152.3 35.0 L156.1 33.1 L160.0 37.0 L163.9 33.2 L167.7 31.2 L171.6 34.4 L175.5 32.2 L179.3 32.7 L183.2 32.7 L187.1 37.6 L190.9 32.8 L194.8 36.5 L198.7 35.8 L202.5 33.0 L206.4 32.3 L210.3 30.9 L214.1 34.1 L218.0 32.3 L221.9 32.2 L225.7 30.9 L229.6 33.2 L233.5 37.3 L237.3 30.7 L241.2 32.5 L245.1 30.9 L248.9 32.5 L252.8 37.3 L256.7 29.2 L260.5 30.0 L264.4 37.2 L268.3 31.0 L272.1 31.5 L276.0 34.9 L279.9 36.3 L283.7 38.1 L287.6 31.9 L291.5 34.5 L295.3 36.0 L299.2 34.7 L303.1 32.8 L306.9 32.7 L310.8 40.5 L314.7 31.3 L318.5 33.9 L322.4 31.4 L326.3 32.9 L330.1 32.8 L334.0 33.4 L337.9 31.9 L341.7 32.6 L345.6 32.7 L349.5 33.6 L353.3 33.9 L357.2 33.4 L361.1 32.5 L364.9 35.0 L368.8 35.6 L372.7 30.4 L376.5 29.4 L380.4 32.4 L384.3 33.2 L388.1 34.0 L392.0 30.1 L395.9 30.1 L399.7 29.9 L403.6 32.4 L407.5 37.1 L411.3 32.7 L415.2 32.3 L419.1 30.6 L422.9 30.2 L426.8 32.0 L430.7 32.7 L434.5 33.8 L438.4 32.6 L442.3 31.2 L446.1 33.0 L450.0 33.4 L453.9 31.1 L457.7 33.8 L461.6 34.0 L465.5 32.0 L469.3 34.7 L473.2 33.6 L477.1 34.6 L480.9 32.9 L484.8 34.4 L488.7 30.6 L492.5 32.4 L496.4 30.4 L500.3 31.2 L504.1 35.5 L508.0 31.5 L511.9 35.1 L515.7 31.1 L519.6 30.4 L523.5 31.3 L527.3 30.0 L531.2 33.8 L535.1 31.2 L538.9 35.1 L542.8 29.5 L546.7 30.4 L550.5 34.0 L554.4 35.2 L558.3 31.3 L562.1 30.4 L566.0 31.7 L569.9 34.6 L573.7 33.0 L577.6 30.7 L581.5 34.6 L585.3 32.9 L589.2 29.7 L593.1 35.3 L596.9 34.0 L600.8 32.4 L604.7 32.4 L608.5 35.6 L612.4 35.0 L616.3 30.0 L620.1 31.3 L624.0 33.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 3, best dog</title></path>
<path d="M47.9 60.1 L51.7 60.6 L55.6 76.7 L59.5 50.6 L63.3 74.1 L67.2 79.6 L71.1 64.2 L74.9 76.2 L78.8 68.8 L82.7 62.0 L86.5 56.2 L90.4 74.1 L94.3 60.2 L98.1 57.1 L102.0 77.6 L105.9 68.7 L109.7 54.1 L113.6 58.8 L117.5 45.4 L121.3 60.5 L125.2 57.6 L129.1 60.7 L132.9 69.9 L136.8 70.4 L140.7 58.3 L144.5 42.1 L148.4 60.2 L152.3 59.7 L156.1 60.4 L160.0 70.8 L163.9 46.0 L167.7 54.9 L171.6 61.0 L175.5 44.1 L179.3 56.3 L183.2 60.2 L187.1 69.6 L190.9 62.5 L194.8 74.6 L198.7 68.7 L202.5 54.7 L206.4 51.5 L210.3 40.5 L214.1 59.6 L218.0 50.7 L221.9 47.8 L225.7 41.4 L229.6 50.5 L233.5 62.3 L237.3 41.0 L241.2 43.5 L245.1 45.4 L248.9 62.2 L252.8 74.3 L256.7 37.0 L260.5 37.9 L264.4 61.5 L268.3 49.9 L272.1 62.2 L276.0 46.9 L279.9 52.3 L283.7 61.3 L287.6 39.8 L291.5 48.4 L295.3 51.2 L299.2 46.5 L303.1 43.7 L306.9 43.4 L310.8 74.6 L314.7 45.2 L318.5 52.5 L322.4 41.2 L326.3 42.2 L330.1 54.0 L334.0 51.6 L337.9 47.1 L341.7 47.0 L345.6 40.2 L349.5 42.9 L353.3 44.0 L357.2 51.2 L361.1 38.8 L364.9 46.1 L368.8 53.8 L372.7 37.8 L376.5 36.0 L380.4 41.6 L384.3 44.8 L388.1 41.8 L392.0 35.2 L395.9 34.0 L399.7 40.9 L403.6 43.5 L407.5 46.2 L411.3 42.1 L415.2 43.8 L419.1 36.3 L422.9 39.9 L426.8 41.7 L430.7 43.8 L434.5 46.4 L438.4 49.2 L442.3 41.7 L446.1 53.8 L450.0 43.6 L453.9 39.3 L457.7 45.4 L461.6 40.6 L465.5 41.4 L469.3 70.1 L473.2 45.3 L477.1 52.5 L480.9 46.9 L484.8 43.0 L488.7 39.2 L492.5 41.9 L496.4 38.5 L500.3 38.5 L504.1 47.9 L508.0 45.4 L511.9 47.6 L515.7 38.7 L519.6 39.1 L523.5 60.8 L527.3 44.7 L531.2 47.9 L535.1 40.0 L538.9 56.3 L542.8 36.5 L546.7 44.5 L550.5 50.8 L554.4 66.0 L558.3 39.3 L562.1 42.9 L566.0 49.4 L569.9 58.3 L573.7 48.5 L577.6 41.1 L581.5 46.6 L585.3 50.2 L589.2 38.5 L593.1 66.0 L596.9 47.6 L600.8 43.2 L604.7 42.9 L608.5 50.2 L612.4 46.7 L616.3 38.4 L620.1 37.4 L624.0 44.9" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 3, batch average</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog (one line per run)</span><span><i style="background:#c97c12"></i>batch average</span></div>
<figcaption>Score by generation for the three batches on all four fields, starting from the retrained dog. It starts high because it starts from a dog that already works.</figcaption>
</figure>

<!-- TABLE:ablation-best -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>switched off (best dog, all four fields)</th><th class="num">score</th><th class="num">penned all</th></tr></thead>
<tbody>
<tr><td>nothing (the dog as evolved)</td><td class="num">2.04</td><td class="num">31 / 32</td></tr>
<tr><td>nearest sheep speed</td><td class="num">1.62</td><td class="num">24 / 32</td></tr>
<tr><td>nearest sheep, where</td><td class="num">1.77</td><td class="num">28 / 32</td></tr>
<tr><td>flock centre</td><td class="num">1.78</td><td class="num">27 / 32</td></tr>
<tr><td>flock to pen</td><td class="num">1.79</td><td class="num">26 / 32</td></tr>
<tr><td>nearest obstacle</td><td class="num">1.82</td><td class="num">28 / 32</td></tr>
<tr><td>nearest sheep, how far</td><td class="num">1.84</td><td class="num">29 / 32</td></tr>
<tr><td>how spread out</td><td class="num">1.88</td><td class="num">28 / 32</td></tr>
<tr><td>furthest sheep</td><td class="num">1.97</td><td class="num">31 / 32</td></tr>
<tr><td>flock drift</td><td class="num">1.99</td><td class="num">30 / 32</td></tr>
<tr><td>flock speed</td><td class="num">2.02</td><td class="num">31 / 32</td></tr>
<tr><td>share still loose</td><td class="num">2.03</td><td class="num">31 / 32</td></tr>
<tr><td>sheep left behind</td><td class="num">2.08</td><td class="num">32 / 32</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The other thing that table shows is that there's no longer any one input you can take away and break it. The open-field dog fell to nothing without the nearest sheep's distance; the retrained dog fell to nothing without it, or without the flock centre, or without the pen. This one drops a bit whatever you take away, and most without the nearest sheep's speed, but it never collapses. Being trained on four fields didn't just make it better at each of them, it made it lean on more things at once, so that no single number is holding the whole dog up. That's the closest this post gets to a general dog, and it took an hour.

## What I took from it

I expected to get the paper's two rules out of this and I got a different dog each time. On the open field evolution found something simpler than the paper, a one-input dog that's faster than the hand-written one and can't do anything else. Put the awkward sheep and the obstacles in the training and it found something that looks at four or five things instead of one, gets round a pond and a wall without ever looking at them, and still only half overlaps with the paper's rules. Put all four fields in and start it from that dog, and it becomes a dog that's better than mine on three fields out of four and doesn't depend on any one thing it can see. The lesson is the same one three times: it learns the fields it's given, and the way to get a general dog is to give it general fields, not cleverer eyes. The rules the paper found weren't the simplest rules that work, they were the simplest rules that work on the fields a real collie has to work.

The other thing is that I can read the paper's dog, and I can only measure this one. I know what the robot collie does because I switched its inputs off one at a time and watched what broke, and because I wrote a thing that guesses what it's doing in the paper's words. It works better on the field it was made for and I understand it less, and I suspect that's the usual trade from here on.

<script src="/sim/sheepdog.js" data-astro-rerun></script>
<script src="/sim/robot-collie.js" data-astro-rerun></script>
<style>
  .sheepdog { margin: 1.5rem 0; }
  .demo-box { margin: 1.5rem 0; border: 1px solid var(--gray-800); border-radius: 1rem; background: var(--gray-999_40); }
  .demo-box > summary { list-style: none; cursor: pointer; padding: 0.9rem 1.1rem; display: flex; gap: 0.75rem 1rem; align-items: baseline; flex-wrap: wrap; }
  .demo-box > summary::-webkit-details-marker { display: none; }
  .demo-box > summary::before { content: "▸"; color: var(--accent-dark); font-size: 0.9em; }
  .demo-box[open] > summary::before { content: "▾"; }
  .demo-box .demo-title { font-family: var(--font-brand); font-weight: 600; color: var(--gray-0); }
  .demo-box .demo-desc { color: var(--gray-300); font-size: var(--text-sm); flex: 1 1 16rem; }
  .demo-box .demo-open { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--accent-dark); }
  .demo-box[open] .demo-open { display: none; }
  .demo-box > .sheepdog { margin: 0; padding: 0 1.1rem 1.1rem; }
  .sheepdog canvas {
    display: block; width: 100%; touch-action: none; cursor: crosshair;
    border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711;
  }
  .sheepdog canvas.robot-field { cursor: default; }
  .sheepdog canvas.robot-chart { cursor: default; margin-top: 0.75rem; height: 120px; border-radius: 0.75rem; }
  .robot-hud-fixed { height: 1.5em; min-height: 1.5em; overflow: hidden; flex-wrap: nowrap; }
  .robot-hud-fixed > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .robot-hud-fixed .sheepdog-stats { flex: 0 0 auto; }
  .sheepdog-hud {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-stats { color: var(--gray-400); white-space: nowrap; }
  .sheepdog-controls {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm);
  }
  .sheepdog-controls button, .sheepdog-controls select {
    font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200);
  }
  .sheepdog-controls button[aria-pressed="true"] { border-color: var(--accent-dark); color: var(--accent-dark); }
  .sheepdog-controls button:hover { border-color: var(--gray-500); }
  .sheepdog-controls label { margin-left: auto; color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
  .sheepdog-controls label.robot-gens { margin-left: 0; }
  .sheepdog-board {
    display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: baseline; margin-top: 0.6rem;
    font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-board b { color: var(--gray-0); font-weight: 600; }
  .sheepdog-verdict { color: var(--accent-dark); }
  .sheepdog-traits { margin-top: 0.4rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
  .robot-thoughts-main { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .robot-thoughts-field { flex: 1 1 380px; min-width: 0; }
  .robot-thoughts-panel { flex: 0 1 260px; min-width: 220px; font-family: var(--font-mono); font-size: var(--text-sm); }
  .robot-label { color: var(--gray-300); margin: 0.4rem 0 0.2rem; }
  .robot-bars { display: flex; flex-direction: column; gap: 2px; }
  .robot-bar { display: grid; grid-template-columns: 6.5em 1fr 3.5em; gap: 0.4rem; align-items: center; color: var(--gray-400); font-size: 0.75rem; }
  .robot-bar i { position: relative; display: block; height: 8px; background: var(--gray-900); border-radius: 3px; overflow: hidden; }
  .robot-bar i b { position: absolute; top: 0; height: 100%; }
  .robot-bar em { font-style: normal; text-align: right; color: var(--gray-500); }
  .robot-out { color: var(--gray-200); display: flex; gap: 0.5rem; align-items: center; margin-top: 0.2rem; }
  .robot-arrow { display: inline-block; font-size: 1.4em; color: var(--accent-dark); transition: transform 0.1s linear; }
  .robot-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .robot-legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .robot-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
  .robot-svg { display: block; width: 100%; height: auto; margin-top: 1rem; }
  .robot-figure { margin: 1.5rem 0; }
  .robot-figure figcaption { font-size: var(--text-sm); color: var(--gray-400); margin-top: 0.5rem; }
  .robot-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); margin: 1rem 0; }
  .robot-table th, .robot-table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--gray-800); }
  .robot-table th { color: var(--gray-300); font-weight: 500; font-family: var(--font-mono); }
  .robot-table td.num, .robot-table th.num { text-align: right; font-family: var(--font-mono); }
  .robot-table-wrap { overflow-x: auto; }
</style>

---

*The sheep, the fields and the hand-written collie are from [the last post](/blog/the-collie-is-the-algorithm/), which has the sources. The robot collie is a plain neural network evolved with a genetic algorithm (tournament selection, uniform crossover, Gaussian mutation, two elites), the sort of thing in Floreano D. & Mattiussi C. (2008), Bio-Inspired Artificial Intelligence, MIT Press. [Robot collie code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/robot-collie.js) · [experiment script](https://github.com/samllbrown/samuellbrown.dev/blob/main/scripts/robot-collie-experiments.mjs).*
