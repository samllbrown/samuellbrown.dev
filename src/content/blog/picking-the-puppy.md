---
title: Picking the puppy
publishDate: 2026-08-31 00:00:00
description: |
  Evolving the robot collie worked, but some of the runs only worked because they got lucky. So I trained two hundred and twenty of them, three different ways, to find out whether you can tell early on which runs are going to come good. There's a game in here where you can have a go at picking one yourself.
tags:
  - Farming
  - Simulation
  - AI
---

Can you tell, early in a training run, whether it's going to come good? In [the last post](/blog/making-a-robot-collie/) I evolved a sheepdog three times with different random seeds. One run had a dog penning whole flocks by generation 2, one by 17, and one not until generation 114. Had I only run the third, at generation 50 I'd have been staring at a flat line, deciding whether to give up on it and rehome it. Another run costs me a minute of laptop, but for a lab that has burned millions it's a serious question. So: lots of runs, watched early, to see whether generation 15 can predict generation 120.

## The setup

Same dog, same sheep, same open field and pen as last time.

<div class="fc-flow" role="img" aria-label="A run is 120 generations. Every generation, a batch of dogs is tried on two fresh flocks, the same flocks for every run. The run's final dog then sits an exam on 30 flocks no run trained on, and that exam score is how the run ended. 220 runs, about a minute each.">
  <div class="fc-step"><b>120</b><span>generations in a run</span></div>
  <div class="fc-step"><b>2</b><span>fresh flocks a generation for the whole batch of dogs, the same flocks for every run</span></div>
  <div class="fc-step"><b>30</b><span>exam flocks for the run's final dog, none of them ever trained on. That score is how the run ended</span></div>
  <div class="fc-step fc-step-tally"><b>220</b><span>runs, about a minute each, trained three ways</span></div>
</div>

<div class="fc-methods">
  <div><b>Evolution</b><span>The genetic algorithm from last time. A batch of 32, keep the fittest, cross them, mutate. Lots of family lines at once.</span></div>
  <div><b>Hill climbing</b><span>One dog. Make 31 mutated copies, keep the best one if it beats the parent, go again. One family line.</span></div>
  <div><b>Evolution strategy</b><span>One dog, never replaced, only nudged. Try 30 small random changes and shift the weights towards the ones that scored better. The nearest thing to gradient descent when you can't take a gradient through a flock of sheep.</span></div>
</div>

One thing about the score. It's sheep penned, plus a bonus for finishing quickly, plus up to 0.3 for how close the loose sheep got to the pen. That last bit was added last time so the early generations aren't all zero, and it means the score curve is already a hand-built early signal. Worth remembering when we ask whether anything beats it.

## The lottery

Every run sits on a floor until one generation a dog pens a whole flock and the score jumps from about 0.3 to 1.5. Here is when that happened for each of the 100 evolution runs, coloured by how the run ended.

<figure class="robot-figure" data-chart="jumps">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Generation in which each evolution run first had a dog pen a whole flock, coloured by how the run ended" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Generation in which each evolution run first had a dog pen a whole flock, coloured by how the run ended</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="184.0" y2="184.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="184.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">5</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">10</text>
<line x1="44" x2="624" y1="72.0" y2="72.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="72.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">15</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">20</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<rect x="55.0" y="206.4" width="42.5" height="33.6" fill="#c97c12" data-tip="3 of the 17 runs whose first penning dog came in generations 1–5 ended in the bottom quarter"/>
<rect x="55.0" y="128.0" width="42.5" height="78.4" fill="rgba(233,230,221,0.35)" data-tip="7 of the 17 runs whose first penning dog came in generations 1–5 ended in the middle"/>
<rect x="55.0" y="49.6" width="42.5" height="78.4" fill="#a93fe0" data-tip="7 of the 17 runs whose first penning dog came in generations 1–5 ended in the top quarter"/>
<text x="76.2" y="258" fill="#8490b5" text-anchor="middle">1–5</text>
<rect x="119.4" y="195.2" width="42.5" height="44.8" fill="#c97c12" data-tip="4 of the 13 runs whose first penning dog came in generations 6–10 ended in the bottom quarter"/>
<rect x="119.4" y="128.0" width="42.5" height="67.2" fill="rgba(233,230,221,0.35)" data-tip="6 of the 13 runs whose first penning dog came in generations 6–10 ended in the middle"/>
<rect x="119.4" y="94.4" width="42.5" height="33.6" fill="#a93fe0" data-tip="3 of the 13 runs whose first penning dog came in generations 6–10 ended in the top quarter"/>
<text x="140.7" y="258" fill="#8490b5" text-anchor="middle">6–10</text>
<rect x="183.8" y="206.4" width="42.5" height="33.6" fill="#c97c12" data-tip="3 of the 18 runs whose first penning dog came in generations 11–15 ended in the bottom quarter"/>
<rect x="183.8" y="72.0" width="42.5" height="134.4" fill="rgba(233,230,221,0.35)" data-tip="12 of the 18 runs whose first penning dog came in generations 11–15 ended in the middle"/>
<rect x="183.8" y="38.4" width="42.5" height="33.6" fill="#a93fe0" data-tip="3 of the 18 runs whose first penning dog came in generations 11–15 ended in the top quarter"/>
<text x="205.1" y="258" fill="#8490b5" text-anchor="middle">11–15</text>
<rect x="248.3" y="217.6" width="42.5" height="22.4" fill="rgba(233,230,221,0.35)" data-tip="2 of the 2 runs whose first penning dog came in generations 16–20 ended in the middle"/>
<text x="269.6" y="258" fill="#8490b5" text-anchor="middle">16–20</text>
<rect x="312.7" y="217.6" width="42.5" height="22.4" fill="rgba(233,230,221,0.35)" data-tip="2 of the 7 runs whose first penning dog came in generations 21–30 ended in the middle"/>
<rect x="312.7" y="161.6" width="42.5" height="56.0" fill="#a93fe0" data-tip="5 of the 7 runs whose first penning dog came in generations 21–30 ended in the top quarter"/>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">21–30</text>
<rect x="377.2" y="228.8" width="42.5" height="11.2" fill="#c97c12" data-tip="1 of the 16 runs whose first penning dog came in generations 31–50 ended in the bottom quarter"/>
<rect x="377.2" y="128.0" width="42.5" height="100.8" fill="rgba(233,230,221,0.35)" data-tip="9 of the 16 runs whose first penning dog came in generations 31–50 ended in the middle"/>
<rect x="377.2" y="60.8" width="42.5" height="67.2" fill="#a93fe0" data-tip="6 of the 16 runs whose first penning dog came in generations 31–50 ended in the top quarter"/>
<text x="398.4" y="258" fill="#8490b5" text-anchor="middle">31–50</text>
<rect x="441.6" y="150.4" width="42.5" height="89.6" fill="rgba(233,230,221,0.35)" data-tip="8 of the 9 runs whose first penning dog came in generations 51–80 ended in the middle"/>
<rect x="441.6" y="139.2" width="42.5" height="11.2" fill="#a93fe0" data-tip="1 of the 9 runs whose first penning dog came in generations 51–80 ended in the top quarter"/>
<text x="462.9" y="258" fill="#8490b5" text-anchor="middle">51–80</text>
<rect x="506.1" y="195.2" width="42.5" height="44.8" fill="#c97c12" data-tip="4 of the 7 runs whose first penning dog came in generations 81–120 ended in the bottom quarter"/>
<rect x="506.1" y="161.6" width="42.5" height="33.6" fill="rgba(233,230,221,0.35)" data-tip="3 of the 7 runs whose first penning dog came in generations 81–120 ended in the middle"/>
<text x="527.3" y="258" fill="#8490b5" text-anchor="middle">81–120</text>
<rect x="570.5" y="116.8" width="42.5" height="123.2" fill="#c97c12" data-tip="11 of the 11 runs that never had a penning dog ended in the bottom quarter"/>
<text x="591.8" y="258" fill="#8490b5" text-anchor="middle">never</text>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation of the first penning dog</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">runs</text>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>ended in the top quarter</span><span><i style="background:rgba(233,230,221,0.5)"></i>the middle</span><span><i style="background:#c97c12"></i>ended in the bottom quarter</span></div>
<figcaption>The generation in which each evolution run first had a dog pen a whole flock. Purple runs ended in the top quarter of the final exam, orange in the bottom quarter.</figcaption>
</figure>

Half the runs had a penning dog by generation 12, three quarters by generation 60, and 11 never did. The colours are the point. Of the 48 runs that jumped by generation 15, 10 ended in the bottom quarter, and 7 of the top-quarter runs didn't jump until after generation 30. Exam scores ran from 0.19 to 2.04, with 39 dogs that penned all thirty flocks and 20 that couldn't reliably pen one.

## Can you pick the puppy?

So here's the game. Four real training runs from the experiment, paused at generation 15, which is an eighth of their budget. For each one you get what a score-watcher would see, which is its score curve so far, and what a shepherd would see, which is the best dog from its latest batch working the same flock as the other three. One of the four ends up the best dog of the litter. Back one.

<div class="sheepdog" data-forecast-bet data-gen="15">
  <div class="fc-grid" data-role="grid"></div>
  <div class="sheepdog-hud"><span data-role="verdict"></span></div>
  <canvas data-role="chart" class="fc-chart" aria-label="Score by generation for the four runs"></canvas>
  <div class="sheepdog-controls">
    <button type="button" data-action="new">New round</button>
    <span class="fc-tally" data-role="tally"></span>
  </div>
</div>

Once you've picked, the chart plays the four futures out, and each field switches to the dog that puppy grew up to be, on the same flock, so you can see what another 105 generations bought. The tally keeps your score against the score-watcher (who always backs the highest curve) and against luck (which gets one in four).

Play a few rounds and two things come through. The first is that at generation 15 most of the puppies look equally hopeless. A dog that has penned a flock in training usually loses one on the demo flock, and the ones that haven't all do the same thing, which is get roughly behind the sheep and shove. The second is that the score-watcher isn't much of a rival. Over the draws this game makes, backing the highest score so far picks the winner 47% of the time, against 25% for guessing. Whether a run had produced a penning dog by generation 15 tells you almost nothing about how it ends: 40 of the 48 that had went on to finish above 1, and so did 40 of the 52 that hadn't.

There is a trick, and it's a fair one. Look at where each line is now, not where it peaked. Every run trains on the same flocks in the same order, so at generation 15 all four puppies have just sat the same two-flock test, and comparing those scores is comparing like with like. A peak back at generation 8 might just mean generation 8 had an easy flock. Backing the best current score picks the winner 69% of the time in this game. The puppy that peaked at 1.09 and is sitting on 0.19 is the one to avoid.

## What the signals know

The game is four runs at a time. This is the same question over all hundred: at nineteen checkpoints in every run I logged everything an early observer could reasonably know, then measured how well each of it predicted the exam.

<div class="fc-flow fc-flow-5" role="img" aria-label="At 19 checkpoints in every run I logged three things about the score curve (best so far, batch average, its slope), two about the batch (how spread out the scores are, how genetically different the dogs are), and three about what the best dog does on three probe flocks it never trains on (time behind the flock, time harassing individual sheep, how far it moves the flock towards the pen). Then the rank correlation of each with the exam score, across all the runs.">
  <div class="fc-step"><b>19</b><span>checkpoints in every run</span></div>
  <div class="fc-step"><b>3</b><span>things about the score curve: best so far, batch average, its slope</span></div>
  <div class="fc-step"><b>2</b><span>things about the batch: how spread out the scores are, how genetically different the dogs are</span></div>
  <div class="fc-step"><b>3</b><span>things the best dog does on three probe flocks it never trains on: time behind the flock, time harassing sheep, how far it moves the flock towards the pen</span></div>
  <div class="fc-step fc-step-tally"><b>ρ</b><span>rank correlation of each signal with the exam score, across all the runs</span></div>
</div>

<figure class="robot-figure" data-chart="corr-ga">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="How well each early signal predicts the final dog (rank correlation), by the generation you peek at, for ga" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":0,"xmax":120,"ymin":-0.4,"ymax":1,"xname":"generation","yfmt":"num","series":[{"name":"best score so far","color":"#a93fe0","points":[[1,0.053],[2,0.15],[3,0.104],[4,0.061],[5,0.088],[6,0.091],[8,0.181],[10,0.12],[12,0.117],[15,0.176],[20,0.209],[25,0.286],[30,0.356],[40,0.437],[50,0.531],[60,0.593],[80,0.652],[100,0.713],[120,0.721]]},{"name":"best score this generation","color":"rgba(233,230,221,0.85)","points":[[1,0.053],[2,0.169],[3,0.051],[4,0.046],[5,0.206],[6,0.189],[8,0.34],[10,0.23],[12,0.177],[15,0.357],[20,0.426],[25,0.5],[30,0.56],[40,0.583],[50,0.655],[60,0.638],[80,0.674],[100,0.714],[120,0.714]]},{"name":"score on probe flocks","color":"#c97c12","points":[[1,0.094],[2,0.175],[3,0.076],[4,-0.044],[5,0.091],[6,0.272],[8,0.291],[10,0.118],[12,0.236],[15,0.041],[20,0.177],[25,0.149],[30,0.269],[40,0.376],[50,0.471],[60,0.529],[80,0.622],[100,0.675],[120,0.783]]},{"name":"time behind the flock","color":"#35a066","points":[[1,0.089],[2,0.081],[3,0.205],[4,0.19],[5,0.036],[6,0.052],[8,0.112],[10,-0.05],[12,0.105],[15,0.097],[20,0.107],[25,0.057],[30,0.189],[40,-0.03],[50,0.209],[60,0.166],[80,0.299],[100,0.277],[120,0.414]]},{"name":"flock progress to pen","color":"#4f9cf9","points":[[1,0.113],[2,0.247],[3,0.087],[4,-0.04],[5,0.061],[6,0.284],[8,0.321],[10,0.059],[12,0.219],[15,0.041],[20,0.107],[25,0.213],[30,0.251],[40,0.319],[50,0.384],[60,0.533],[80,0.568],[100,0.644],[120,0.692]]},{"name":"genome diversity","color":"#e05c7a","points":[[1,-0.182],[2,-0.022],[3,0.044],[4,0.073],[5,0.055],[6,0.162],[8,0.173],[10,0.244],[12,0.098],[15,0.11],[20,-0.177],[25,-0.274],[30,-0.315],[40,-0.26],[50,-0.46],[60,-0.444],[80,-0.431],[100,-0.145],[120,-0.352]]}]}'>
<title>How well each early signal predicts the final dog (rank correlation), by the generation you peek at, for ga</title>
<line x1="44" x2="624" y1="176.0" y2="176.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="176.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="96.0" y2="96.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="96.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.5</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="189.0" y="258" fill="#8490b5" text-anchor="middle">30</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">60</text>
<text x="479.0" y="258" fill="#8490b5" text-anchor="middle">90</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">120</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="176.0" y2="176.0" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation you peek at</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">rank correlation with final score</text>
<path d="M48.8 167.5 L53.7 152.0 L58.5 159.4 L63.3 166.2 L68.2 161.9 L73.0 161.4 L82.7 147.0 L92.3 156.8 L102.0 157.3 L116.5 147.8 L140.7 142.6 L164.8 130.2 L189.0 119.0 L237.3 106.1 L285.7 91.0 L334.0 81.1 L430.7 71.7 L527.3 61.9 L624.0 60.6" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M48.8 167.5 L53.7 149.0 L58.5 167.8 L63.3 168.6 L68.2 143.0 L73.0 145.8 L82.7 121.6 L92.3 139.2 L102.0 147.7 L116.5 118.9 L140.7 107.8 L164.8 96.0 L189.0 86.4 L237.3 82.7 L285.7 71.2 L334.0 73.9 L430.7 68.2 L527.3 61.8 L624.0 61.8" fill="none" stroke="rgba(233,230,221,0.85)" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M48.8 161.0 L53.7 148.0 L58.5 163.8 L63.3 183.0 L68.2 161.4 L73.0 132.5 L82.7 129.4 L92.3 157.1 L102.0 138.2 L116.5 169.4 L140.7 147.7 L164.8 152.2 L189.0 133.0 L237.3 115.8 L285.7 100.6 L334.0 91.4 L430.7 76.5 L527.3 68.0 L624.0 50.7" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M48.8 161.8 L53.7 163.0 L58.5 143.2 L63.3 145.6 L68.2 170.2 L73.0 167.7 L82.7 158.1 L92.3 184.0 L102.0 159.2 L116.5 160.5 L140.7 158.9 L164.8 166.9 L189.0 145.8 L237.3 180.8 L285.7 142.6 L334.0 149.4 L430.7 128.2 L527.3 131.7 L624.0 109.8" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M48.8 157.9 L53.7 136.5 L58.5 162.1 L63.3 182.4 L68.2 166.2 L73.0 130.6 L82.7 124.6 L92.3 166.6 L102.0 141.0 L116.5 169.4 L140.7 158.9 L164.8 141.9 L189.0 135.8 L237.3 125.0 L285.7 114.6 L334.0 90.7 L430.7 85.1 L527.3 73.0 L624.0 65.3" fill="none" stroke="#4f9cf9" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M48.8 205.1 L53.7 179.5 L58.5 169.0 L63.3 164.3 L68.2 167.2 L73.0 150.1 L82.7 148.3 L92.3 137.0 L102.0 160.3 L116.5 158.4 L140.7 204.3 L164.8 219.8 L189.0 226.4 L237.3 217.6 L285.7 249.6 L334.0 247.0 L430.7 245.0 L527.3 199.2 L624.0 232.3" fill="none" stroke="#e05c7a" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>best score so far</span><span><i style="background:rgba(233,230,221,0.85)"></i>best score this generation</span><span><i style="background:#c97c12"></i>score on probe flocks</span><span><i style="background:#35a066"></i>time behind the flock</span><span><i style="background:#4f9cf9"></i>flock progress to pen</span><span><i style="background:#e05c7a"></i>genome diversity</span></div>
<figcaption>Rank correlation between each signal, read at a given generation, and the run's final exam score, across the 100 evolution runs. 1 would be a perfect early forecast; 0 is no information.</figcaption>
</figure>

Nothing you can see at generation 15 is worth much. The best signal there is this generation's best score, with a rank correlation of 0.36 with the exam. The best score so far, which is the thing you'd naturally watch, is at 0.18. No signal gets to 0.5 before generation 25, and even at the very end of training the run's own best score only correlates 0.72 with how its dog does on flocks it hasn't seen. The spread of scores across the batch looks like a good signal (0.40 at generation 15) but it's the same signal in disguise: when one dog pens a flock the maximum and the spread jump together, and the two correlate at 0.94, so I've left it off the chart.

The behavioural probes were the ones I wanted to work, and they didn't. Time spent behind the flock hovers around zero until generation 80. How far the champion moves the flock towards the pen, and its score on the three probe flocks, both sit near zero at generation 15 and only catch up with the score curve at around generation 60. My best guess at why is that the score is a statistic of a whole batch of 32 dogs, while the probe watches one dog on three flocks, and early on one dog is flaky. It pens one flock and loses the next. The one behavioural measure I'd have bet against, time spent close to the sheep, turned out to point the other way: the dogs that end up best are the ones pressing the flock, not the polite ones. It's the strongest behavioural signal late on (0.58 at generation 80) and nothing at 15.

Genetic diversity is the odd one out. Slightly positive early on, then negative from generation 25 (−0.46 by generation 50), because a population that has converged has found something worth converging on. It's not a leading signal, but it's a good sign that a jump, when it comes, is real.

Correlations are a bit abstract, so here is the same thing done the way the game does it. Draw four runs at random, back the one the signal ranks top, and count how often that turns out to be the best of the four. Guessing gets 25%. At generation 15 the best signal gets 40%. At generation 120, with the whole training run behind you, the training score still only picks the best of four dogs half the time, because the exam is on flocks none of them trained on.

<details class="demo-box">
<summary><span class="demo-title">Picking the best of four</span><span class="demo-desc">How often the run a signal ranks top at that generation ends best of a random four. Guessing gets 25%.</span><span class="demo-open">open</span></summary>
<div class="demo-box-body">
<!-- TABLE:pick4 -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>signal read at generation…</th><th class="num">5</th><th class="num">15</th><th class="num">30</th><th class="num">50</th><th class="num">80</th><th class="num">120</th></tr></thead>
<tbody>
<tr><td>best score so far</td><td class="num">32%</td><td class="num">35%</td><td class="num">42%</td><td class="num">47%</td><td class="num">48%</td><td class="num">50%</td></tr>
<tr><td>best score this generation</td><td class="num">36%</td><td class="num">40%</td><td class="num">47%</td><td class="num">49%</td><td class="num">48%</td><td class="num">48%</td></tr>
<tr><td>score on three probe flocks</td><td class="num">35%</td><td class="num">35%</td><td class="num">43%</td><td class="num">46%</td><td class="num">54%</td><td class="num">58%</td></tr>
<tr><td>flock progress to pen</td><td class="num">32%</td><td class="num">32%</td><td class="num">42%</td><td class="num">39%</td><td class="num">52%</td><td class="num">45%</td></tr>
<tr><td>time behind the flock</td><td class="num">28%</td><td class="num">35%</td><td class="num">37%</td><td class="num">36%</td><td class="num">36%</td><td class="num">38%</td></tr>
<tr><td>guessing</td><td class="num">25%</td><td class="num">25%</td><td class="num">25%</td><td class="num">25%</td><td class="num">25%</td><td class="num">25%</td></tr>
</tbody></table></div>
</div>
</details>

## Keep or rehome

Prediction is only worth anything if it changes what you do with your compute. The practical version, which Hyperband and successive halving built an industry on, is triage: start more runs than you can afford to finish, rehome the unpromising ones early, and give the ones you keep the budget. At the same total compute, is that better than running fewer to the finish?

The sums: the budget is four full runs. Triage starts eight, rehomes at some generation down to however many the leftover budget can carry to the end (three up to generation 20, two up to 40, one at 50, never over budget), and keeps the ones with the best score so far. Both policies hand over their best dog. This is how often triage wins, over a few thousand draws from the real runs:

<figure class="robot-figure" data-chart="cull">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="How often triage by the score so far beats four full runs at the same compute, by the generation you rehome at" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":0,"xmax":50,"ymin":0,"ymax":100,"xname":"rehome at generation","yfmt":"pct","series":[{"name":"evolution","color":"#a93fe0","points":[[1,43.9],[2,47.3],[3,47.2],[4,47.7],[5,46.6],[6,47.9],[8,53.2],[10,50.1],[12,44.6],[15,48.4],[20,50.2],[25,44.5],[30,48.6],[40,50.8],[50,34.4]]},{"name":"hill climbing","color":"#c97c12","points":[[1,50.9],[2,57.1],[3,55],[4,52.1],[5,58.9],[6,59.4],[8,57.6],[10,56.3],[12,51.5],[15,51.4],[20,51.7],[25,42.5],[30,44.9],[40,50.3],[50,32.8]]},{"name":"evolution strategy","color":"#35a066","points":[[1,59.8],[2,63.7],[3,64.1],[4,63],[5,63.7],[6,64],[8,63.8],[10,63.8],[12,65.9],[15,66.5],[20,65.7],[25,60.5],[30,59.9],[40,65],[50,56.8]]},{"name":"rehome at random","color":"rgba(233,230,221,0.6)","points":[[1,41.8],[2,40.5],[3,40.7],[4,41.2],[5,40.9],[6,41],[8,40.5],[10,41.2],[12,42.2],[15,40.4],[20,40.9],[25,29.2],[30,29.1],[40,29.6],[50,16.9]]}]}'>
<title>How often triage by the score so far beats four full runs at the same compute, by the generation you rehome at</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="184.0" y2="184.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="184.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">25</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">50</text>
<line x1="44" x2="624" y1="72.0" y2="72.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="72.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">75</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">100</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="160.0" y="258" fill="#8490b5" text-anchor="middle">10</text>
<text x="276.0" y="258" fill="#8490b5" text-anchor="middle">20</text>
<text x="392.0" y="258" fill="#8490b5" text-anchor="middle">30</text>
<text x="508.0" y="258" fill="#8490b5" text-anchor="middle">40</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">50</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation you rehome at</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">triage wins (%)</text>
<path d="M55.6 141.7 L67.2 134.0 L78.8 134.3 L90.4 133.2 L102.0 135.6 L113.6 132.7 L136.8 120.8 L160.0 127.8 L183.2 140.1 L218.0 131.6 L276.0 127.6 L334.0 140.3 L392.0 131.1 L508.0 126.2 L624.0 162.9" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 126.0 L67.2 112.1 L78.8 116.8 L90.4 123.3 L102.0 108.1 L113.6 106.9 L136.8 111.0 L160.0 113.9 L183.2 124.6 L218.0 124.9 L276.0 124.2 L334.0 144.8 L392.0 139.4 L508.0 127.3 L624.0 166.5" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 106.0 L67.2 97.3 L78.8 96.4 L90.4 98.9 L102.0 97.3 L113.6 96.6 L136.8 97.1 L160.0 97.1 L183.2 92.4 L218.0 91.0 L276.0 92.8 L334.0 104.5 L392.0 105.8 L508.0 94.4 L624.0 112.8" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 146.4 L67.2 149.3 L78.8 148.8 L90.4 147.7 L102.0 148.4 L113.6 148.2 L136.8 149.3 L160.0 147.7 L183.2 145.5 L218.0 149.5 L276.0 148.4 L334.0 174.6 L392.0 174.8 L508.0 173.7 L624.0 202.1" fill="none" stroke="rgba(233,230,221,0.6)" stroke-width="2" stroke-opacity="1" stroke-dasharray="4 4" stroke-linejoin="round"/>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>evolution</span><span><i style="background:#c97c12"></i>hill climbing</span><span><i style="background:#35a066"></i>evolution strategy</span><span><i style="background:rgba(233,230,221,0.6)"></i>rehome at random</span></div>
<figcaption>How often the triaged litter's best dog beats the best of four full runs, by the generation you rehome at, keeping the runs with the best score so far. The dashed line rehomes at random. 50% is a draw.</figcaption>
</figure>

On the evolution runs it doesn't pay: about 50% at every generation, a draw. Rehoming at random gets 40%, which is the price of finishing three runs instead of four. The reason is the base rate. 39 of the 100 runs end with a dog that pens everything, so the best of four random runs already averages 1.99 out of a possible 2.04, and there's nothing for triage to buy except the 10 to 20% of compute it doesn't spend. The other two lotteries have more blanks in them, and there triage pays: 59% for hill climbing at generation 5, and two times in three for the evolution strategy at generation 15, because half of its runs never get off the floor and by then the score knows which half. Rehoming by what the dog does rather than what it scores never beats rehoming by score where triage pays, and for hill climbing it's worse than random.

<details class="demo-box">
<summary><span class="demo-title">Rehoming by other signals</span><span class="demo-desc">How often triage at generation 15 beats four full runs, by the signal you rehome on.</span><span class="demo-open">open</span></summary>
<div class="demo-box-body">
<!-- TABLE:cull -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>rehome at generation 15 by…</th><th class="num">score so far</th><th class="num">score this generation</th><th class="num">probe score</th><th class="num">time behind flock</th><th class="num">flock progress</th><th class="num">random</th></tr></thead>
<tbody>
<tr><td>evolution</td><td class="num">48%</td><td class="num">54%</td><td class="num">52%</td><td class="num">52%</td><td class="num">49%</td><td class="num">40%</td></tr>
<tr><td>hill climbing</td><td class="num">51%</td><td class="num">53%</td><td class="num">41%</td><td class="num">37%</td><td class="num">38%</td><td class="num">41%</td></tr>
<tr><td>evolution strategy</td><td class="num">66%</td><td class="num">60%</td><td class="num">48%</td><td class="num">47%</td><td class="num">49%</td><td class="num">39%</td></tr>
</tbody></table></div>
</div>
</details>

## Three ways to train, three kinds of luck

The same study for the other two optimizers. Every run's exam score, sorted:

<figure class="robot-figure" data-chart="lottery">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Final score on thirty unseen flocks, every run sorted worst to best, per optimizer" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":0,"xmax":100,"ymin":0,"ymax":2.3,"xname":"percentile","yfmt":"num","series":[{"name":"evolution (the GA)","color":"#a93fe0","points":[[1,0.193],[2,0.2],[3,0.203],[4,0.21],[5,0.211],[6,0.216],[7,0.218],[8,0.22],[9,0.227],[10,0.229],[11,0.257],[12,0.284],[13,0.299],[14,0.48],[15,0.584],[16,0.862],[17,0.914],[18,0.92],[19,0.924],[20,0.938],[21,1.055],[22,1.221],[23,1.368],[24,1.371],[25,1.466],[26,1.625],[27,1.657],[28,1.666],[29,1.72],[30,1.734],[31,1.737],[32,1.771],[33,1.776],[34,1.785],[35,1.789],[36,1.79],[37,1.804],[38,1.813],[39,1.818],[40,1.823],[41,1.839],[42,1.865],[43,1.871],[44,1.871],[45,1.874],[46,1.88],[47,1.891],[48,1.906],[49,1.909],[50,1.916],[51,1.917],[52,1.926],[53,1.928],[54,1.929],[55,1.939],[56,1.94],[57,1.955],[58,1.956],[59,1.962],[60,1.965],[61,1.973],[62,1.973],[63,1.976],[64,1.977],[65,1.981],[66,1.982],[67,1.984],[68,1.985],[69,1.986],[70,1.989],[71,1.99],[72,1.993],[73,1.995],[74,1.996],[75,1.999],[76,2],[77,2.001],[78,2.001],[79,2.002],[80,2.005],[81,2.006],[82,2.006],[83,2.008],[84,2.008],[85,2.009],[86,2.01],[87,2.011],[88,2.012],[89,2.013],[90,2.017],[91,2.019],[92,2.019],[93,2.022],[94,2.024],[95,2.024],[96,2.025],[97,2.025],[98,2.027],[99,2.028],[100,2.036]]},{"name":"hill climbing","color":"#c97c12","points":[[1.67,0.135],[3.33,0.143],[5,0.152],[6.67,0.156],[8.33,0.168],[10,0.198],[11.67,0.25],[13.33,0.312],[15,0.322],[16.67,0.338],[18.33,0.465],[20,0.516],[21.67,0.639],[23.33,0.684],[25,0.688],[26.67,0.75],[28.33,0.809],[30,0.837],[31.67,0.877],[33.33,0.89],[35,0.913],[36.67,0.914],[38.33,0.92],[40,0.937],[41.67,1.067],[43.33,1.072],[45,1.105],[46.67,1.177],[48.33,1.221],[50,1.249],[51.67,1.334],[53.33,1.354],[55,1.376],[56.67,1.382],[58.33,1.384],[60,1.398],[61.67,1.407],[63.33,1.409],[65,1.475],[66.67,1.483],[68.33,1.491],[70,1.609],[71.67,1.62],[73.33,1.661],[75,1.67],[76.67,1.683],[78.33,1.73],[80,1.734],[81.67,1.758],[83.33,1.772],[85,1.777],[86.67,1.792],[88.33,1.797],[90,1.819],[91.67,1.879],[93.33,1.905],[95,1.963],[96.67,1.973],[98.33,1.974],[100,1.986]]},{"name":"evolution strategy","color":"#35a066","points":[[1.67,0.193],[3.33,0.193],[5,0.194],[6.67,0.198],[8.33,0.2],[10,0.2],[11.67,0.201],[13.33,0.201],[15,0.201],[16.67,0.202],[18.33,0.202],[20,0.203],[21.67,0.203],[23.33,0.203],[25,0.203],[26.67,0.205],[28.33,0.205],[30,0.206],[31.67,0.206],[33.33,0.207],[35,0.207],[36.67,0.207],[38.33,0.207],[40,0.208],[41.67,0.208],[43.33,0.213],[45,0.213],[46.67,0.231],[48.33,0.248],[50,0.255],[51.67,0.255],[53.33,0.265],[55,0.341],[56.67,0.36],[58.33,0.364],[60,0.402],[61.67,0.404],[63.33,0.489],[65,0.566],[66.67,0.592],[68.33,0.688],[70,0.903],[71.67,0.934],[73.33,1.158],[75,1.474],[76.67,1.535],[78.33,1.592],[80,1.666],[81.67,1.673],[83.33,1.843],[85,1.879],[86.67,1.898],[88.33,1.958],[90,1.984],[91.67,1.997],[93.33,2.022],[95,2.023],[96.67,2.03],[98.33,2.033],[100,2.04]]}]}'>
<title>Final score on thirty unseen flocks, every run sorted worst to best, per optimizer</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.14)"/><text x="36" y="142.6" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<line x1="44" x2="624" y1="45.2" y2="45.2" stroke="rgba(255,255,255,0.14)"/><text x="36" y="45.2" fill="#8490b5" text-anchor="end" dominant-baseline="middle">2</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="189.0" y="258" fill="#8490b5" text-anchor="middle">25</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="479.0" y="258" fill="#8490b5" text-anchor="middle">75</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">100</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">runs, worst to best (%)</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">final score (1 = every sheep in)</text>
<path d="M49.8 221.2 L55.6 220.5 L61.4 220.2 L67.2 219.5 L73.0 219.5 L78.8 219.0 L84.6 218.8 L90.4 218.6 L96.2 217.9 L102.0 217.7 L107.8 215.0 L113.6 212.3 L119.4 210.9 L125.2 193.3 L131.0 183.1 L136.8 156.0 L142.6 151.0 L148.4 150.4 L154.2 150.0 L160.0 148.6 L165.8 137.3 L171.6 121.1 L177.4 106.8 L183.2 106.5 L189.0 97.2 L194.8 81.7 L200.6 78.6 L206.4 77.7 L212.2 72.5 L218.0 71.1 L223.8 70.8 L229.6 67.5 L235.4 67.0 L241.2 66.2 L247.0 65.8 L252.8 65.7 L258.6 64.3 L264.4 63.4 L270.2 62.9 L276.0 62.5 L281.8 60.9 L287.6 58.4 L293.4 57.8 L299.2 57.8 L305.0 57.5 L310.8 56.9 L316.6 55.8 L322.4 54.4 L328.2 54.1 L334.0 53.4 L339.8 53.3 L345.6 52.4 L351.4 52.2 L357.2 52.1 L363.0 51.2 L368.8 51.1 L374.6 49.6 L380.4 49.5 L386.2 48.9 L392.0 48.6 L397.8 47.8 L403.6 47.8 L409.4 47.6 L415.2 47.5 L421.0 47.1 L426.8 47.0 L432.6 46.8 L438.4 46.7 L444.2 46.6 L450.0 46.3 L455.8 46.2 L461.6 45.9 L467.4 45.7 L473.2 45.6 L479.0 45.3 L484.8 45.2 L490.6 45.1 L496.4 45.1 L502.2 45.0 L508.0 44.7 L513.8 44.6 L519.6 44.6 L525.4 44.4 L531.2 44.4 L537.0 44.3 L542.8 44.2 L548.6 44.1 L554.4 44.0 L560.2 44.0 L566.0 43.6 L571.8 43.4 L577.6 43.4 L583.4 43.1 L589.2 42.9 L595.0 42.9 L600.8 42.8 L606.6 42.8 L612.4 42.6 L618.2 42.5 L624.0 41.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M53.7 226.9 L63.3 226.1 L73.0 225.2 L82.7 224.8 L92.3 223.6 L102.0 220.7 L111.7 215.7 L121.3 209.6 L131.0 208.6 L140.7 207.1 L150.3 194.7 L160.0 189.7 L169.7 177.8 L179.3 173.4 L189.0 173.0 L198.7 167.0 L208.3 161.2 L218.0 158.5 L227.7 154.6 L237.3 153.3 L247.0 151.1 L256.7 151.0 L266.3 150.4 L276.0 148.7 L285.7 136.1 L295.3 135.6 L305.0 132.4 L314.7 125.4 L324.3 121.1 L334.0 118.4 L343.7 110.1 L353.3 108.1 L363.0 106.0 L372.7 105.4 L382.3 105.2 L392.0 103.8 L401.7 103.0 L411.3 102.8 L421.0 96.3 L430.7 95.6 L440.3 94.8 L450.0 83.3 L459.7 82.2 L469.3 78.2 L479.0 77.4 L488.7 76.1 L498.3 71.5 L508.0 71.1 L517.7 68.8 L527.3 67.4 L537.0 66.9 L546.7 65.5 L556.3 65.0 L566.0 62.8 L575.7 57.0 L585.3 54.5 L595.0 48.8 L604.7 47.8 L614.3 47.7 L624.0 46.6" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M53.7 221.2 L63.3 221.2 L73.0 221.1 L82.7 220.7 L92.3 220.5 L102.0 220.5 L111.7 220.4 L121.3 220.4 L131.0 220.4 L140.7 220.3 L150.3 220.3 L160.0 220.2 L169.7 220.2 L179.3 220.2 L189.0 220.2 L198.7 220.0 L208.3 220.0 L218.0 219.9 L227.7 219.9 L237.3 219.8 L247.0 219.8 L256.7 219.8 L266.3 219.8 L276.0 219.7 L285.7 219.7 L295.3 219.3 L305.0 219.3 L314.7 217.5 L324.3 215.8 L334.0 215.2 L343.7 215.2 L353.3 214.2 L363.0 206.8 L372.7 204.9 L382.3 204.5 L392.0 200.8 L401.7 200.7 L411.3 192.4 L421.0 184.9 L430.7 182.3 L440.3 173.0 L450.0 152.1 L459.7 149.0 L469.3 127.2 L479.0 96.4 L488.7 90.5 L498.3 85.0 L508.0 77.7 L517.7 77.1 L527.3 60.5 L537.0 57.0 L546.7 55.2 L556.3 49.3 L566.0 46.8 L575.7 45.5 L585.3 43.1 L595.0 43.0 L604.7 42.3 L614.3 42.0 L624.0 41.3" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>evolution (the GA)</span><span><i style="background:#c97c12"></i>hill climbing</span><span><i style="background:#35a066"></i>evolution strategy</span></div>
<figcaption>Every run's final exam score, sorted from worst to best, for each optimizer: 100 evolution runs, 60 hill-climbing runs, 60 evolution-strategy runs.</figcaption>
</figure>

Evolution is the jagged one: 39 of 100 runs end with a dog that pens everything, 20 with a dog that can't pen one, and which is which is nearly invisible at generation 15. Hill climbing is the cautious one. One family line, keep the child only if it beats the parent, and it mostly ends up good enough: 36 of 60 runs above 1, but only 3 that pen everything. Once a lineage has a habit that works, a mutation rarely finds a better one that also beats it on the next two flocks, so it settles down. The evolution strategy was the surprise. When I was setting this up it looked stuck: it climbs the slope the shaping bonus gives it, learns to get behind the flock and push, and then sits on 0.2 for fifty generations. But 17 of 60 runs did get there, 9 of them with dogs that pen everything, and the way they get there is different. It isn't a jump, it's a ramp, twenty or thirty generations of the score creeping from 0.5 up to 2, mostly starting after generation 50. The other 32 never left the floor.

It is also the most predictable of the three. The best score so far at generation 15 correlates 0.59 with the ending for the evolution strategy, 0.48 for hill climbing and 0.18 for evolution. So the trade is this: the optimizer you can forecast is the one with the most duds, and the one that wins most often is the one you can't read.

<!-- TABLE:opts -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>optimizer</th><th class="num">runs</th><th class="num">mean exam score</th><th class="num">dogs that pen everything</th><th class="num">runs that never got going</th><th class="num">score at gen 15 vs ending (ρ)</th><th class="num">triage at gen 15 wins</th></tr></thead>
<tbody>
<tr><td>evolution</td><td class="num">100</td><td class="num">1.60</td><td class="num">39 (39%)</td><td class="num">13 (13%)</td><td class="num">0.18</td><td class="num">48%</td></tr>
<tr><td>hill climbing</td><td class="num">60</td><td class="num">1.16</td><td class="num">3 (5%)</td><td class="num">7 (12%)</td><td class="num">0.48</td><td class="num">51%</td></tr>
<tr><td>evolution strategy</td><td class="num">60</td><td class="num">0.73</td><td class="num">9 (15%)</td><td class="num">32 (53%)</td><td class="num">0.59</td><td class="num">66%</td></tr>
</tbody></table></div>

## What this looks like with real money

Scale the field up and the question doesn't change, but the stakes do. There are two kinds of training run out there, and they're the two shapes in this post.

<div class="fc-compare">
  <div class="fc-card">
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M6 8 C 40 40, 90 50, 194 54" fill="none" stroke="#35a066" stroke-width="2.5" stroke-linecap="round"/></svg>
    <b>Smooth</b>
    <span class="fc-card-sub">Big models on next-token prediction. My evolution strategy is the toy version.</span>
    <ul>
      <li>Loss follows scaling laws so reliable that labs fit them on small runs and predict a model a hundred times bigger to within a percent. That's how the size of Llama 3 was chosen.</li>
      <li>Extrapolating the curve is a science: Bayesian fits, transformers trained to read learning curves, and Hyperband to industrialise keep-or-rehome.</li>
    </ul>
  </div>
  <div class="fc-card">
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M6 52 L 60 51 L 90 53 L 118 50 L 128 18 L 150 14 L 194 8" fill="none" stroke="#a93fe0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <b>Jagged</b>
    <span class="fc-card-sub">Reinforcement learning, including the RL that turns base models into assistants. Evolution and hill climbing are the toy versions.</span>
    <ul>
      <li>Long plateaus, sudden jumps when a behaviour clicks, and big run-to-run variance from nothing but the seed.</li>
      <li>The same shape as "emergent abilities": the loss is predictable, the capability sits at zero and then jumps, like sheep penned did for my dogs. The smooth-curve tools don't fit it, and the literature is mostly still describing the problem.</li>
    </ul>
  </div>
</div>

I expected the transferable idea to be that what a model does carries earlier signal than what it scores. This study is no evidence for that: the score curve won, and what helped was reading it properly and starting more runs than you finish. I'd still bet the idea is right at scale, because the labs' evaluation suites are exactly that, a probe of what a model can do rather than its loss. My dogs didn't show it.

## What I took from it

Hover a bar for the numbers behind it.

<figure class="robot-figure fc-takeaways">
  <div class="fc-take">
    <b>40%</b>
    <span class="fc-card-sub">How often the best signal at generation 15, an eighth of the budget, picks the best of four runs. Guessing gets 25%, so you can't really pick the puppy that early.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="At generation 15 the best signal picks the best of four runs 40% of the time, against 25% for guessing and 49% at generation 50.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">guessing</text>
    <rect x="78" y="3" width="29.5" height="12" rx="2" fill="#4c5470" data-tip="<b>guessing</b><br>picks the best of four 25% of the time"/>
    <text x="111.5" y="12.5" fill="#e9e6dd" font-size="8.5">25%</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">generation 15</text>
    <rect x="78" y="21" width="47.2" height="12" rx="2" fill="#c561f6" data-tip="<b>best score this generation, read at 15</b><br>picks the best of four 40% of the time, rank correlation 0.36 with the exam"/>
    <text x="129.2" y="30.5" fill="#e9e6dd" font-size="8.5">40%</text>
    <text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">generation 50</text>
    <rect x="78" y="39" width="57.8" height="12" rx="2" fill="#4c5470" data-tip="<b>same signal, read at 50</b><br>49%, and still under half at the finish"/>
    <text x="139.8" y="48.5" fill="#e9e6dd" font-size="8.5">49%</text>
    </svg>
  </div>
  <div class="fc-take">
    <b>69%</b>
    <span class="fc-card-sub">The score-watcher in the game once it compared runs on the same test at the same time rather than on their best-ever scores, which are often just an easy flock.</span>
    <svg viewBox="0 0 200 40" role="img" aria-label="Comparing runs on the same test at the same time took the score-watcher from 47% to 69%.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">best ever</text>
    <rect x="78" y="3" width="55.5" height="12" rx="2" fill="#4c5470" data-tip="<b>compare best-ever scores</b><br>right 47% of the time"/>
    <text x="137.5" y="12.5" fill="#e9e6dd" font-size="8.5">47%</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">same test</text>
    <rect x="78" y="21" width="81.4" height="12" rx="2" fill="#c561f6" data-tip="<b>compare on the same test at the same time</b><br>right 69% of the time"/>
    <text x="163.4" y="30.5" fill="#e9e6dd" font-size="8.5">69%</text>
    </svg>
  </div>
  <div class="fc-take">
    <b>35%</b>
    <span class="fc-card-sub">I wanted watching the dog to beat the score at generation 15 and it didn't, at least not here. One dog on three flocks against a score that sums a batch of 32, and early dogs are flaky, so it isn't the last word.</span>
    <svg viewBox="0 0 200 76" role="img" aria-label="At generation 15 the score picks the best of four 40% of the time, the three probe flocks 35%, flock progress 32%, guessing 25%.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">score</text>
    <rect x="78" y="3" width="47.2" height="12" rx="2" fill="#c561f6" data-tip="<b>best score this generation</b><br>picks the best of four 40% of the time"/>
    <text x="129.2" y="12.5" fill="#e9e6dd" font-size="8.5">40%</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">three probes</text>
    <rect x="78" y="21" width="41.3" height="12" rx="2" fill="#4c5470" data-tip="<b>score on three probe flocks</b><br>35%"/>
    <text x="123.3" y="30.5" fill="#e9e6dd" font-size="8.5">35%</text>
    <text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">progress</text>
    <rect x="78" y="39" width="37.8" height="12" rx="2" fill="#4c5470" data-tip="<b>flock progress to pen</b><br>32%"/>
    <text x="119.8" y="48.5" fill="#e9e6dd" font-size="8.5">32%</text>
    <text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">guessing</text>
    <rect x="78" y="57" width="29.5" height="12" rx="2" fill="#4c5470" data-tip="<b>guessing</b><br>25%"/>
    <text x="111.5" y="66.5" fill="#e9e6dd" font-size="8.5">25%</text>
    </svg>
  </div>
  <div class="fc-take">
    <b>66%</b>
    <span class="fc-card-sub">How often rehoming half the litter at generation 15 beats four full runs. It depends on how many runs were going to fail anyway: a draw for evolution, where four in ten come good, and two times in three for the evolution strategy, where half never get off the floor.</span>
    <svg viewBox="0 0 200 76" role="img" aria-label="Rehoming at generation 15 by score so far beats four full runs 48% of the time for evolution, 51% for hill climbing, 66% for the evolution strategy, and about 40% at random.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">evolution</text>
    <rect x="78" y="3" width="56.6" height="12" rx="2" fill="#a93fe0" data-tip="<b>evolution</b><br>rehoming by score so far at 15 wins 48%, a draw. 39% of runs end with a dog that pens everything"/>
    <text x="138.6" y="12.5" fill="#e9e6dd" font-size="8.5">48%</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">hill climbing</text>
    <rect x="78" y="21" width="60.2" height="12" rx="2" fill="#c97c12" data-tip="<b>hill climbing</b><br>51% at generation 15, 59% at generation 5"/>
    <text x="142.2" y="30.5" fill="#e9e6dd" font-size="8.5">51%</text>
    <text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">evo. strategy</text>
    <rect x="78" y="39" width="77.9" height="12" rx="2" fill="#35a066" data-tip="<b>evolution strategy</b><br>66%, because 53% of its runs never got going and by 15 the score knows which"/>
    <text x="159.9" y="48.5" fill="#e9e6dd" font-size="8.5">66%</text>
    <text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">at random</text>
    <rect x="78" y="57" width="47.2" height="12" rx="2" fill="#4c5470" data-tip="<b>rehoming at random</b><br>about 40% for all three, the price of finishing three runs instead of four"/>
    <text x="129.2" y="66.5" fill="#e9e6dd" font-size="8.5">40%</text>
    </svg>
  </div>
  <div class="fc-take">
    <b>0.59</b>
    <span class="fc-card-sub">How well the score at generation 15 predicts the ending, per optimizer. The evolution strategy is the most predictable and the one that fails most often, and evolution is the least predictable and has the most winners.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="Rank correlation between the score at generation 15 and the ending: evolution 0.18, hill climbing 0.48, evolution strategy 0.59.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">evolution</text>
    <rect x="78" y="3" width="21.2" height="12" rx="2" fill="#a93fe0" data-tip="<b>evolution</b><br>ρ 0.18 at generation 15. 39% of runs pen everything, 13% never got going"/>
    <text x="103.2" y="12.5" fill="#e9e6dd" font-size="8.5">0.18</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">hill climbing</text>
    <rect x="78" y="21" width="56.6" height="12" rx="2" fill="#c97c12" data-tip="<b>hill climbing</b><br>ρ 0.48. 5% pen everything, 12% never got going"/>
    <text x="138.6" y="30.5" fill="#e9e6dd" font-size="8.5">0.48</text>
    <text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">evo. strategy</text>
    <rect x="78" y="39" width="69.6" height="12" rx="2" fill="#35a066" data-tip="<b>evolution strategy</b><br>ρ 0.59. 15% pen everything, 53% never got going"/>
    <text x="151.6" y="48.5" fill="#e9e6dd" font-size="8.5">0.59</text>
    </svg>
  </div>
  <div class="fc-take">
    <b>0.72</b>
    <span class="fc-card-sub">How well a finished evolution run's training score agrees with its exam on unseen flocks. Even a finished run is a bit of a lottery, so a fair amount of the unpredictability is the exam rather than the training.</span>
    <svg viewBox="0 0 200 40" role="img" aria-label="For evolution the rank correlation with the exam is 0.18 at generation 15 and 0.72 for the finished run.">
    <text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">generation 15</text>
    <rect x="78" y="3" width="21.2" height="12" rx="2" fill="#4c5470" data-tip="<b>score at generation 15 vs exam</b><br>ρ 0.18"/>
    <text x="103.2" y="12.5" fill="#e9e6dd" font-size="8.5">0.18</text>
    <text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">generation 120</text>
    <rect x="78" y="21" width="85.0" height="12" rx="2" fill="#a93fe0" data-tip="<b>final training score vs exam</b><br>ρ 0.72 for evolution, and a perfect exam would be 1.00"/>
    <text x="167.0" y="30.5" fill="#e9e6dd" font-size="8.5">0.72</text>
    </svg>
  </div>
</figure>

<script src="/sim/sheepdog.js" data-astro-rerun></script>
<script src="/sim/robot-collie.js" data-astro-rerun></script>
<script src="/sim/collie-forecast-runs.js" data-astro-rerun></script>
<script src="/sim/collie-forecast.js" data-astro-rerun></script>
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
  .demo-box > .demo-box-body { padding: 0 1.1rem 0.6rem; }
  .fc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
  @media (max-width: 560px) { .fc-grid { grid-template-columns: minmax(0, 1fr); } }
  .fc-panel { min-width: 0; font-family: var(--font-mono); font-size: var(--text-sm); }
  .fc-panel canvas.fc-field { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid var(--gray-800); background: #0e1711; }
  .fc-panel canvas.fc-spark { display: block; width: 100%; height: 34px; margin-top: 0.3rem; }
  .fc-title { margin-bottom: 0.3rem; color: var(--gray-300); display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  .fc-panel button { font: inherit; margin-top: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 999px; cursor: pointer; border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200); }
  .fc-panel button:hover:not(:disabled) { border-color: var(--gray-500); }
  .fc-panel button:disabled { opacity: 0.55; cursor: default; }
  .fc-field-wrap { position: relative; }
  .fc-badge { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.15rem 0.55rem; border-radius: 999px; background: rgba(9,11,17,0.8); color: var(--accent-dark); font-family: var(--font-mono); font-size: var(--text-sm); pointer-events: none; }
  .fc-badge:empty { display: none; }
  .fc-panel.fc-winner canvas.fc-field { border-color: var(--accent-dark); }
  .fc-flow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  .fc-flow-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  @media (max-width: 640px) { .fc-flow, .fc-flow-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .fc-step { position: relative; border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.25rem; }
  .fc-step b { font-family: var(--font-brand); font-size: 1.9rem; line-height: 1.1; color: var(--accent-dark); }
  .fc-step span { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.45; }
  .fc-step:not(:last-child)::after { content: "→"; position: absolute; right: -0.85rem; top: 1rem; color: var(--gray-500); font-size: 1.1rem; }
  .fc-step-tally { border-style: dashed; }
  .fc-step-tally b { color: var(--gray-0); }
  @media (max-width: 640px) { .fc-step:not(:last-child)::after { content: none; } .fc-flow-5 .fc-step-tally { grid-column: 1 / -1; } }
  .fc-takeaways { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0 0; }
  @media (max-width: 860px) { .fc-takeaways { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .fc-takeaways { grid-template-columns: minmax(0, 1fr); } }
  .fc-take { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
  .fc-take > b { font-family: var(--font-brand); font-size: 1.9rem; line-height: 1.1; color: var(--accent-dark); }
  .fc-take svg { display: block; width: 100%; height: auto; margin-top: auto; padding-top: 0.4rem; }
  .fc-take svg text { font-family: var(--font-mono); }
  .fc-take rect[data-tip] { cursor: default; }
  .fc-tip { position: fixed; z-index: 50; pointer-events: none; max-width: 24rem; padding: 0.45rem 0.65rem; border: 1px solid var(--gray-700); border-radius: 0.5rem; background: rgba(9,11,17,0.96); color: var(--gray-200); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.5; }
  .fc-tip b { color: var(--gray-0); }
  .fc-tip i { display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin: 0 0.4rem 0.2rem 0; }
  .fc-tip-x { display: block; color: var(--gray-400); margin-bottom: 0.15rem; }
  .robot-figure rect[data-tip].fc-hot { stroke: #fff; stroke-width: 1.5; }
  .robot-figure svg { touch-action: pan-y; }
  .fc-compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 640px) { .fc-compare { grid-template-columns: minmax(0, 1fr); } }
  .fc-card { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem 0.6rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; }
  .fc-card svg { display: block; width: 100%; height: 3.4rem; }
  .fc-card b { font-family: var(--font-brand); font-size: 1.2rem; color: var(--gray-0); }
  .fc-card-sub { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.45; }
  .fc-card ul { margin: 0.2rem 0 0; padding-left: 1.1rem; font-size: var(--text-sm); color: var(--gray-300); line-height: 1.5; }
  .fc-card li { margin: 0.35rem 0; }
  .fc-methods { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 640px) { .fc-methods { grid-template-columns: minmax(0, 1fr); } }
  .fc-methods > div { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; }
  .fc-methods b { font-family: var(--font-brand); font-size: 1.1rem; color: var(--gray-0); }
  .fc-methods span { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.5; }
  .fc-chart { display: block; width: 100%; height: 150px; margin-top: 0.9rem; }
  .fc-tally { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
  .fc-out { margin-top: 0.8rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); line-height: 1.6; }
  .fc-out b { color: var(--gray-0); }
  .sheepdog-hud { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .sheepdog-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm); }
  .sheepdog-controls button, .sheepdog-controls select { font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer; border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200); }
  .sheepdog-controls button:hover { border-color: var(--gray-500); }
  .sheepdog-controls label { color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
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

*The sheep, the field and the dog are from [the last two](/blog/the-collie-is-the-algorithm/) [posts](/blog/making-a-robot-collie/). Every number and every run in this post comes from one script on the same code as the demos, seeded: [experiment script](https://github.com/samllbrown/samuellbrown.dev/blob/main/scripts/collie-forecast-experiments.mjs) · [demo code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/collie-forecast.js). The grown-up versions of this question: scaling laws ([Kaplan et al. 2020](https://arxiv.org/abs/2001.08361), [Hoffmann et al. 2022](https://arxiv.org/abs/2203.15556), and [a practical guide](https://arxiv.org/abs/2410.11840)); learning-curve extrapolation ([Domhan et al. 2015](https://www.ijcai.org/Abstract/15/487), [LC-PFN, NeurIPS 2023](https://arxiv.org/abs/2310.20447), [a review of curve shapes](https://arxiv.org/abs/2103.10948)); early stopping at scale ([Hyperband](https://arxiv.org/abs/1603.06560)); judging networks without training them ([zero-cost proxies](https://arxiv.org/abs/2101.08134)); the jump problem ([emergent abilities](https://arxiv.org/abs/2206.07682), [and the case they're a mirage of the metric](https://arxiv.org/abs/2304.15004)); and the evolution strategy is [Salimans et al. 2017](https://arxiv.org/abs/1703.03864).*
