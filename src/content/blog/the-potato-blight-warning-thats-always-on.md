---
title: The potato blight warning that's always on
publishDate: 2026-09-09 00:00:00
description: |
  British potato growers get a blight warning built on a two-day humidity rule. I scored it against twenty years of scout reports, including the days when nothing followed, which the published tests skip, and found it is on for most of the summer. There's a rule you can bend yourself, a season you can play out on a map, a sharper warning to look inside, and a version of it that runs every morning.
tags:
  - Farming
  - Data
  - AI
---

Does the blight warning tell a potato grower which week to worry about? The one Britain issues is the **Hutton Criteria**: two days running with a minimum of 10°C and six hours at 90% humidity, and a red dot on the map. I took every outbreak the Fight Against Blight scouts have reported since 2006, put the rule back together from weather station records at every postcode district, and scored it the way it has never been scored, against the days when nothing followed.

## The problem

Late blight is the disease that took Ireland's potato crop in the 1840s, and it hasn't gone anywhere. Given a warm wet week it can turn a green field brown in ten days, so British growers don't wait for it: a crop gets a protective fungicide every seven days or so from June until the haulm comes off, whatever the forecast says. What the warning is for is the decisions inside that programme, whether to tighten the interval to five days this week, switch to a dearer product, or walk the field for the first lesions, and since 2023 the strains arriving in Britain resist two of the main fungicide groups, so a spray at the wrong moment costs more than money.

The rule behind the warning has a good pedigree. Smith fitted it to English weather and outbreak records in the 1950s, and Hutton's researchers relaxed it in 2017 when they found the modern strains infect after six humid hours rather than eleven. Both times the test was the same: for each outbreak, was there an alert in the four weeks before? The Hutton version passed 96% of the time, and that number is what the service still rests on. What the test can't say is how often the alert was on when nothing followed, and that decides whether a red dot means "this week" or just "it's July".

So this is what I set out to do, in order.

<div class="fc-methods">
  <div><b>1. Score the warning properly</b><span>Rebuild the rule at every postcode district from station weather, reproduce the published 96%, then score every district-day, including the ones where nothing followed.</span></div>
  <div><b>2. Try to build a sharper one</b><span>Same public data, same catch rate, fewer alert days. Start with the things the rule ignores (what week it is, what the scouts have already reported nearby) and add better weather on top.</span></div>
  <div><b>3. Find out where the signal is</b><span>Which of those parts does the work, and does the rule earn its keep anywhere, in any month or region? That decides what a grower should read into the red dot.</span></div>
</div>

## The setup

<div class="fc-flow" role="img" aria-label="3,259 confirmed outbreak reports from 2006 to 2025, in 525 postcode districts, with hourly weather from 100 stations interpolated to each district, giving 1.35 million district-days scored across the fourteen held-out seasons.">
  <div class="fc-step"><b>3,259</b><span>outbreak reports from the Fight Against Blight scouts, 2006 to 2025, each with a date and a postcode district</span></div>
  <div class="fc-step"><b>525</b><span>postcode districts that have ever reported, each with its own daily weather from the nearest four of 100 stations</span></div>
  <div class="fc-step"><b>184</b><span>days a season, 1 May to 31 October, and for each district-day the question: does a report follow within a week?</span></div>
  <div class="fc-step fc-step-tally"><b>1.35M</b><span>district-days scored, every season from 2012 held out in turn with models fitted only on the seasons before it</span></div>
</div>

<div class="fc-methods">
  <div><b>Smith Period</b><span>1956. Two consecutive days with a minimum of 10°C and at least eleven hours at 90% humidity or more.</span></div>
  <div><b>Hutton Criteria</b><span>2017. The same, with six humid hours instead of eleven, because the modern strains infect faster. This is what BlightSpy and Fight Against Blight issue.</span></div>
  <div><b>What the test leaves out</b><span>Both rules were validated by asking whether an alert came in the 28 days before each outbreak, which says nothing about the days when no outbreak came. The published figures count an alert only on the day it is declared.</span></div>
</div>

## One summer under the rule

Pick a district and a year. The orange line is the night's minimum temperature, the bars are hours at 90% humidity, purple bars are days meeting the rule, the shading is the alert being on, and the triangles along the top are the scouts' reports. Then bend the rule and watch the shading.

<div class="sheepdog" data-blight-season>
  <div class="sheepdog-controls">
    <label>district <select data-role="district"></select></label>
    <label>year <select data-role="year"></select></label>
    <button type="button" data-preset="hutton">Hutton</button>
    <button type="button" data-preset="smith">Smith</button>
  </div>
  <canvas class="bl-canvas" aria-label="One season of daily minimum temperature, humid hours, rule days, alert and reports"></canvas>
  <div class="sheepdog-hud" data-role="hud"></div>
  <div class="bl-rules">
    <label>min temp ≥ <input type="range" data-rule="tmin" min="4" max="16" step="0.5" value="10"><span data-rule-out="tmin"></span></label>
    <label>humid hours ≥ <input type="range" data-rule="hours" min="1" max="18" step="1" value="6"><span data-rule-out="hours"></span></label>
    <label>days running <input type="range" data-rule="days" min="1" max="4" step="1" value="2"><span data-rule-out="days"></span></label>
    <label>alert held for <input type="range" data-rule="window" min="3" max="28" step="1" value="14"><span data-rule-out="window"></span></label>
  </div>
</div>

This is Angus in 2012, the worst blight year in the record; switch to 2018 for the driest. In both the shading covers most of July and August, and the demo shows why. Once summer arrives the orange line sits above the 10° mark nearly every night, because a British night in July is rarely colder than that, and six hours at 90% humidity is just a night with dew on the grass, so the bars clear the 6 h mark most days too. Both halves of the rule are met by ordinary summer weather, two such days in a row come along every week, and each one keeps the alert on for a fortnight. The reports land inside the shading, and so does everything else. The rule only bites at the edges of the season, in May when the nights are still cold and in late September when they turn cold again, which is where you can see the shading break up.

One choice sits under every number on this page: how long a Hutton period keeps the alert on. I count a district as under alert for the 14 days after a period, because infection takes a week or two to show and the published validation itself looks back 28 days, but the published figures count an alert only on the day a period is declared, which is how the same rule gives Skelsey 31% of alert days and me 61%. Drag the "alert held for" slider and watch the shading, the share of days and the catch all move while the last number, the published test, doesn't.

<figure class="robot-figure" data-chart="hold">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Share of district-days under alert and share of outbreak-weeks caught, against how many days a Hutton period keeps the alert on; the published test does not move" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":0,"xmax":28,"ymin":0,"ymax":100,"xname":"held for days","yfmt":"pct","series":[{"name":"district-days under alert","color":"#a93fe0","points":[[1,16.07],[2,22.31],[3,28.54],[5,38.11],[7,45.36],[10,53.35],[14,60.69],[21,68.26],[28,72.95]]},{"name":"outbreak-weeks caught","color":"#35a066","points":[[1,26.59],[2,36],[3,45.54],[5,58.95],[7,67.82],[10,76.63],[14,83.95],[21,90.26],[28,93.25]]},{"name":"reports with a period in the 28 days before (the published test)","color":"#c97c12","points":[[1,94.48],[2,94.48],[3,94.48],[5,94.48],[7,94.48],[10,94.48],[14,94.48],[21,94.48],[28,94.48]]}]}'>
<title>Share of district-days under alert and share of outbreak-weeks caught, against how many days a Hutton period keeps the alert on; the published test does not move</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="184.0" y2="184.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="184.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">25</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">50</text>
<line x1="44" x2="624" y1="72.0" y2="72.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="72.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">75</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">100</text>
<text x="64.7" y="258" fill="#8490b5" text-anchor="middle">1</text>
<text x="189.0" y="258" fill="#8490b5" text-anchor="middle">7</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">14</text>
<text x="479.0" y="258" fill="#8490b5" text-anchor="middle">21</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">28</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">days the alert is held after a Hutton period</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">percent</text>
<path d="M64.7 204.0 L85.4 190.0 L106.1 176.1 L147.6 154.6 L189.0 138.4 L251.1 120.5 L334.0 104.1 L479.0 87.1 L624.0 76.6" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M64.7 180.4 L85.4 159.4 L106.1 138.0 L147.6 108.0 L189.0 88.1 L251.1 68.3 L334.0 52.0 L479.0 37.8 L624.0 31.1" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M64.7 28.4 L85.4 28.4 L106.1 28.4 L147.6 28.4 L189.0 28.4 L251.1 28.4 L334.0 28.4 L479.0 28.4 L624.0 28.4" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-dasharray="4 4" stroke-linejoin="round"/>
<circle cx="334.0" cy="104.1" r="7" fill="#a93fe0" stroke="#fff" stroke-width="1.5" data-tip="<b>held 14 days, as used here</b><br>on for 61% of days"/>
<circle cx="334.0" cy="52.0" r="7" fill="#35a066" stroke="#fff" stroke-width="1.5" data-tip="<b>held 14 days, as used here</b><br>catches 84% of outbreak-weeks"/>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>district-days under alert</span><span><i style="background:#35a066"></i>outbreak-weeks caught</span><span><i style="background:#c97c12"></i>reports with a period in the 28 days before (the published test)</span></div>
<figcaption>The full run at every hold from one day to 28. Held for 7 days the alert covers 45% of district-days and catches 68% of outbreak-weeks; on the declared day alone, 16% and 27%. The published test sits at 94 to 95% throughout, because it can't see any of this.</figcaption>
</figure>

## Score it yourself

Every rule in the family lands somewhere on this chart. Across the axes are how much of the season it spends switched on and how many of the outbreak-weeks it catches while on. The curves are what the full run found for other kinds of signal on all 525 districts, and the white dot is the Hutton rule as issued. Your rule is scored live on the seven demo districts and twenty seasons.

<div class="sheepdog" data-blight-score>
  <canvas class="bl-canvas" aria-label="Catch rate against alert days for your rule, with the full-run curves"></canvas>
  <div class="sheepdog-hud" data-role="hud"></div>
  <div class="bl-rules">
    <label>min temp ≥ <input type="range" data-rule="tmin" min="4" max="16" step="0.5" value="10"><span data-rule-out="tmin"></span></label>
    <label>humid hours ≥ <input type="range" data-rule="hours" min="1" max="18" step="1" value="6"><span data-rule-out="hours"></span></label>
    <label>days running <input type="range" data-rule="days" min="1" max="4" step="1" value="2"><span data-rule-out="days"></span></label>
    <label>alert held for <input type="range" data-rule="window" min="3" max="28" step="1" value="14"><span data-rule-out="window"></span></label>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-action="sweep" data-sweep="hours">Sweep the humid hours from 1 to 18</button>
    <button type="button" data-action="sweep" data-sweep="window">Sweep the hold from 1 to 28 days</button>
    <button type="button" data-preset="hutton">Hutton</button>
    <button type="button" data-preset="smith">Smith</button>
  </div>
  <div class="robot-legend"><span><i style="background:#c561f6"></i>model: calendar, nearby reports, place and weather</span><span><i style="background:#35a066"></i>reports within 100 km in the last 28 days</span><span><i style="background:#c97c12"></i>week of the year alone</span><span><i style="background:#a93fe0"></i>Hutton days in the last 14 days</span></div>
</div>

Sweep the hours and the rule traces its own curve, and the whole family sits under the calendar. Sweep the hold and it traces the same curve from the other end, so the 14 days is a choice of where to sit on it, not a way off it. Moving the temperature or the days running moves it along that curve too. The published test (the share of reports with a period in the 28 days before) barely moves either, because it can't tell a rule that is nearly always on from one that is right.

## A season on the map

Play a season. Purple districts are under a Hutton alert that day, orange rings are the reports as they arrive, fading over three weeks.

<div class="sheepdog" data-blight-map>
  <div class="sheepdog-controls">
    <label>season <select data-role="year"></select></label>
    <button type="button" data-action="play">Play</button>
    <button type="button" data-action="step">Step a day</button>
    <button type="button" data-action="reset">Reset</button>
  </div>
  <canvas class="bl-canvas bl-map" aria-label="Map of Britain, districts coloured by Hutton alert status day by day, with reports appearing"></canvas>
  <div class="sheepdog-hud" data-role="hud"></div>
</div>

By July the map is purple from Cornwall to Aberdeenshire and stays that way, while the reports come in clusters: Kent and Suffolk one fortnight, Angus and Fife the next. The alert has no way of knowing which cluster is next because it doesn't look at the reports at all.

## Inside a sharper warning

This is the model from step two, fitted only on seasons before the one shown. It doesn't replace the weather rule, it adds three things the rule ignores: what week it is, what has been reported nearby (weighted by distance and how recent), and how often this district has reported before. Scrub through a season and watch what it's reading.

<div class="sheepdog" data-blight-thoughts>
  <div class="sheepdog-controls">
    <label>district <select data-role="district"></select></label>
    <label>year <select data-role="year"></select></label>
    <span class="fc-tally" data-role="date"></span>
    <span class="bl-badge" data-role="badge"></span>
  </div>
  <canvas class="bl-canvas" aria-label="Model probability through the season with the Hutton alert shaded and reports marked"></canvas>
  <input type="range" class="bl-day" data-role="day" min="0" max="183" value="60" aria-label="day of season">
  <div class="bl-bars" data-role="bars"></div>
  <div class="sheepdog-hud"><span data-role="soon"></span></div>
</div>

The purple line is the model's chance of a report in this district in the coming week, the blue line is a model given weather alone. In a bad year the purple line climbs a fortnight before the first local report, on the strength of reports arriving thirty miles away, and the weather line goes up and down with the humidity as it has all summer.

## So, is it a better model?

<div class="fc-compare">
  <div class="fc-card">
    <b>Yes: a sharper warning</b>
    <span class="fc-card-sub">Fitted only on earlier seasons and scored on each season in turn, the full model catches the outbreak-weeks the Hutton alert catches while being on for 30% of days instead of 61%, and it ranks days at 0.86 AUC against 0.62. It wins on all four ways of asking the question, in every region, and in every one of the fourteen seasons.</span>
  </div>
  <div class="fc-card">
    <b>No: not a better weather rule</b>
    <span class="fc-card-sub">Given weather alone, the best model I could build reaches 0.75, which is real but modest, and once the model also knows the week and what has been reported nearby, that weather adds a single point. Most of the sharpness comes from information the rule ignores, not from reading humidity better than Smith did in 1956.</span>
  </div>
</div>

The research model scores the day it is on, where BlightSpy looks eight days ahead, and its nearby-reports term leans on scouts being where the blight is. What it shows is that the two ingredients that sharpen the warning most, the calendar and the outbreak map, are already published by the same people who issue the red dot, so the obvious next step was to run it.

## This week, live

Every morning a small job pulls this season's reports from the Fight Against Blight API, pulls a fortnight back and eight days ahead of hourly weather for all 525 districts from Open-Meteo, builds the same features as the research panel, and scores every district for today and the week ahead with the model fitted on 2006 to 2025. Pick a day. It is an experiment on public data, not spray advice.

<div class="sheepdog" data-blight-live data-src="https://raw.githubusercontent.com/samllbrown/blight-forecast/master/live/latest.json">
  <div class="sheepdog-controls bl-days" data-role="days"></div>
  <canvas class="bl-canvas bl-map" data-role="map" aria-label="Map of Britain, districts coloured by the model's chance of a report this week, with the Hutton alert and this season's reports"></canvas>
  <div class="sheepdog-hud" data-role="hud"></div>
  <canvas class="bl-canvas" data-role="strip" aria-label="This season so far: share of districts under a Hutton alert, share above the model's line, and reports per day"></canvas>
  <div class="sheepdog-hud"><span data-role="score"></span></div>
  <div class="sheepdog-hud"><span class="fc-tally" data-role="stamp"></span></div>
</div>

The map is the same as the earlier one with the model's view painted over it: the Hutton ring is on nearly everywhere, and the model's colour is concentrated where reports have been arriving. Once the outlook has loaded, the first and fourth demos gain a "so far (live)" entry in their year lists, so you can see this season's Angus under the rule, and what the model is reading there today. The weather it runs on is Open-Meteo's analysis and forecast rather than the station records the model was fitted on, so its Hutton flag will disagree with BlightSpy's on some days; the model's probability moves little, because most of it comes from the calendar and the reports.

## The numbers

First the trade-off every signal makes, then when in the season the alert works.

<figure class="robot-figure" data-chart="curves">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Share of outbreak-weeks caught against share of district-days under alert, every season 2012 to 2025 held out in turn" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":0,"xmax":100,"ymin":0,"ymax":100,"xname":"alert days %","yfmt":"pct","series":[{"name":"model: calendar, nearby reports, place and weather","color":"#c561f6","points":[[2,26.2],[4,39.8],[6,48.1],[8,54.5],[10,59],[12,63.3],[14,66.6],[16,69.7],[18,72.4],[20,74.9],[22,77],[24,79],[26,80.8],[28,82.5],[30,84],[32,85.5],[34,86.6],[36,87.8],[38,88.9],[40,89.7],[42,90.6],[44,91.3],[46,92.1],[48,92.8],[50,93.3],[52,93.8],[54,94.3],[56,94.8],[58,95.2],[60,95.6],[62,96.1],[64,96.4],[66,96.8],[68,97],[70,97.4],[72,97.5],[74,97.7],[76,98.1],[78,98.3],[80,98.6],[82,98.7],[84,99],[86,99.1],[88,99.3],[90,99.4],[92,99.6],[94,99.7],[96,99.8],[98,99.9],[100,100]]},{"name":"reports within 100 km in the last 28 days","color":"#35a066","points":[[2,10.3],[4,19],[6,24.9],[8,31.5],[10,37.4],[12,41.4],[14,45.6],[16,48.7],[18,52.5],[20,55.8],[22,59.4],[24,61.6],[26,64.9],[28,66.7],[30,69.1],[32,71.8],[34,74.6],[36,76.3],[38,77.4],[40,78.3],[42,80.3],[44,81.6],[46,83.3],[48,85.1],[50,85.9],[52,86.4],[54,86.6],[56,86.7],[58,87.7],[60,88.7],[62,89.3],[64,89.4],[66,89.6],[68,89.9],[70,90.4],[72,91.7],[74,92.4],[76,93],[78,93.4],[80,93.7],[82,94.4],[84,95.2],[86,96],[88,96.7],[90,97.2],[92,97.9],[94,98.6],[96,99.1],[98,99.3],[100,100]]},{"name":"week of the year alone","color":"#c97c12","points":[[2,2.5],[4,5.5],[6,8.7],[8,11.1],[10,13.8],[12,16.9],[14,23.6],[16,29.3],[18,34.2],[20,39.4],[22,44.3],[24,47.8],[26,51.2],[28,54.3],[30,58],[32,60.9],[34,64.7],[36,67.3],[38,69.8],[40,73.3],[42,74.9],[44,77.4],[46,80.3],[48,81.9],[50,83.3],[52,85],[54,86.5],[56,87],[58,88.2],[60,89.5],[62,90.8],[64,91.4],[66,92.5],[68,93],[70,93.6],[72,94.5],[74,95.3],[76,95.6],[78,95.6],[80,96.3],[82,96.6],[84,97.3],[86,97.6],[88,97.7],[90,98.3],[92,98.6],[94,99.3],[96,99.5],[98,99.7],[100,100]]},{"name":"Hutton days in the last 14 days","color":"#a93fe0","points":[[2,5.2],[4,10.5],[6,16.4],[8,19.7],[10,24.2],[12,27],[14,31.3],[16,34.5],[18,37],[20,41.3],[22,43.7],[24,46.5],[26,49.5],[28,52],[30,54.9],[32,57],[34,59.8],[36,62],[38,64.7],[40,66.5],[42,68.3],[44,70.6],[46,73.2],[48,75.4],[50,77.1],[52,78.6],[54,80.1],[56,82.3],[58,84.4],[60,85.4],[62,86.5],[64,88.1],[66,89.3],[68,91],[70,92],[72,93.1],[74,93.3],[76,94.3],[78,95.4],[80,96.4],[82,97.1],[84,97.1],[86,97.6],[88,97.7],[90,98.1],[92,98.5],[94,98.8],[96,99],[98,99.4],[100,100]]}]}'>
<title>Share of outbreak-weeks caught against share of district-days under alert, every season 2012 to 2025 held out in turn</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="184.0" y2="184.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="184.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">25</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">50</text>
<line x1="44" x2="624" y1="72.0" y2="72.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="72.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">75</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">100</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="189.0" y="258" fill="#8490b5" text-anchor="middle">25</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="479.0" y="258" fill="#8490b5" text-anchor="middle">75</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">100</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">district-days under alert (%)</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">outbreak-weeks caught (%)</text>
<path d="M55.6 181.3 L67.2 150.8 L78.8 132.3 L90.4 117.9 L102.0 107.8 L113.6 98.2 L125.2 90.8 L136.8 83.9 L148.4 77.8 L160.0 72.2 L171.6 67.5 L183.2 63.0 L194.8 59.0 L206.4 55.2 L218.0 51.8 L229.6 48.5 L241.2 46.0 L252.8 43.3 L264.4 40.9 L276.0 39.1 L287.6 37.1 L299.2 35.5 L310.8 33.7 L322.4 32.1 L334.0 31.0 L345.6 29.9 L357.2 28.8 L368.8 27.6 L380.4 26.8 L392.0 25.9 L403.6 24.7 L415.2 24.1 L426.8 23.2 L438.4 22.7 L450.0 21.8 L461.6 21.6 L473.2 21.2 L484.8 20.3 L496.4 19.8 L508.0 19.1 L519.6 18.9 L531.2 18.2 L542.8 18.0 L554.4 17.6 L566.0 17.3 L577.6 16.9 L589.2 16.7 L600.8 16.4 L612.4 16.2 L624.0 16.0" fill="none" stroke="#c561f6" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 216.9 L67.2 197.4 L78.8 184.2 L90.4 169.4 L102.0 156.2 L113.6 147.3 L125.2 137.9 L136.8 130.9 L148.4 122.4 L160.0 115.0 L171.6 106.9 L183.2 102.0 L194.8 94.6 L206.4 90.6 L218.0 85.2 L229.6 79.2 L241.2 72.9 L252.8 69.1 L264.4 66.6 L276.0 64.6 L287.6 60.1 L299.2 57.2 L310.8 53.4 L322.4 49.4 L334.0 47.6 L345.6 46.5 L357.2 46.0 L368.8 45.8 L380.4 43.6 L392.0 41.3 L403.6 40.0 L415.2 39.7 L426.8 39.3 L438.4 38.6 L450.0 37.5 L461.6 34.6 L473.2 33.0 L484.8 31.7 L496.4 30.8 L508.0 30.1 L519.6 28.5 L531.2 26.8 L542.8 25.0 L554.4 23.4 L566.0 22.3 L577.6 20.7 L589.2 19.1 L600.8 18.0 L612.4 17.6 L624.0 16.0" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 234.4 L67.2 227.7 L78.8 220.5 L90.4 215.1 L102.0 209.1 L113.6 202.1 L125.2 187.1 L136.8 174.4 L148.4 163.4 L160.0 151.7 L171.6 140.8 L183.2 132.9 L194.8 125.3 L206.4 118.4 L218.0 110.1 L229.6 103.6 L241.2 95.1 L252.8 89.2 L264.4 83.6 L276.0 75.8 L287.6 72.2 L299.2 66.6 L310.8 60.1 L322.4 56.5 L334.0 53.4 L345.6 49.6 L357.2 46.2 L368.8 45.1 L380.4 42.4 L392.0 39.5 L403.6 36.6 L415.2 35.3 L426.8 32.8 L438.4 31.7 L450.0 30.3 L461.6 28.3 L473.2 26.5 L484.8 25.9 L496.4 25.9 L508.0 24.3 L519.6 23.6 L531.2 22.0 L542.8 21.4 L554.4 21.2 L566.0 19.8 L577.6 19.1 L589.2 17.6 L600.8 17.1 L612.4 16.7 L624.0 16.0" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M55.6 228.4 L67.2 216.5 L78.8 203.3 L90.4 195.9 L102.0 185.8 L113.6 179.5 L125.2 169.9 L136.8 162.7 L148.4 157.1 L160.0 147.5 L171.6 142.1 L183.2 135.8 L194.8 129.1 L206.4 123.5 L218.0 117.0 L229.6 112.3 L241.2 106.0 L252.8 101.1 L264.4 95.1 L276.0 91.0 L287.6 87.0 L299.2 81.9 L310.8 76.0 L322.4 71.1 L334.0 67.3 L345.6 63.9 L357.2 60.6 L368.8 55.6 L380.4 50.9 L392.0 48.7 L403.6 46.2 L415.2 42.7 L426.8 40.0 L438.4 36.2 L450.0 33.9 L461.6 31.5 L473.2 31.0 L484.8 28.8 L496.4 26.3 L508.0 24.1 L519.6 22.5 L531.2 22.5 L542.8 21.4 L554.4 21.2 L566.0 20.3 L577.6 19.4 L589.2 18.7 L600.8 18.2 L612.4 17.3 L624.0 16.0" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M44.0 240.0 L624.0 16.0" fill="none" stroke="rgba(233,230,221,0.6)" stroke-width="2" stroke-opacity="1" stroke-dasharray="4 4" stroke-linejoin="round"/>
<circle cx="396.1" cy="51.8" r="7" fill="#e9e6dd" stroke="#fff" stroke-width="1.5" data-tip="<b>the Hutton alert as issued</b><br>on for 61% of district-days, catches 84% of the days followed by a report"/>
</svg>
<div class="robot-legend"><span><i style="background:#e9e6dd"></i>the Hutton alert as issued</span><span><i style="background:#c561f6"></i>model: calendar, nearby reports, place and weather</span><span><i style="background:#35a066"></i>reports within 100 km in the last 28 days</span><span><i style="background:#c97c12"></i>week of the year alone</span><span><i style="background:#a93fe0"></i>Hutton days in the last 14 days</span></div>
<figcaption>Every signal traced from "never alert" to "always alert". The higher the curve, the more outbreak-weeks caught for the same number of alert days. The Hutton rule as issued sits below the calendar.</figcaption>
</figure>

<figure class="robot-figure" data-chart="weeks">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="By week of the year: how often the alert is on, and when the outbreaks come" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":119,"xmax":308,"ymin":0,"ymax":100,"xname":"day of year","yfmt":"pct","series":[{"name":"district-days under Hutton alert","color":"#a93fe0","points":[[126,6.4],[133,18.8],[140,26.7],[147,37.7],[154,41.1],[161,50.5],[168,58.4],[175,66.6],[182,70.4],[189,71.4],[196,77.2],[203,83.1],[210,84.4],[217,77.7],[224,78.3],[231,82.7],[238,86],[245,88.3],[252,83.8],[259,75.2],[266,66.9],[273,60.4],[280,59.1],[287,52.3],[294,57],[301,56.6]]},{"name":"outbreak-weeks that week, as a share of the busiest week","color":"#c97c12","points":[[126,4.029],[133,7.073],[140,10.743],[147,17.637],[154,22.292],[161,39.302],[168,51.925],[175,58.908],[182,82.811],[189,96.329],[196,100],[203,87.377],[210,86.929],[217,82.632],[224,83.527],[231,64.19],[238,54.79],[245,42.614],[252,28.917],[259,22.739],[266,17.278],[273,17.099],[280,9.669],[287,7.699],[294,7.699],[301,4.208]]}]}'>
<title>By week of the year: how often the alert is on, and when the outbreaks come</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="184.0" y2="184.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="184.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">25</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">50</text>
<line x1="44" x2="624" y1="72.0" y2="72.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="72.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">75</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">100</text>
<text x="50.1" y="258" fill="#8490b5" text-anchor="middle">May</text>
<text x="145.3" y="258" fill="#8490b5" text-anchor="middle">Jun</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">Jul</text>
<text x="332.5" y="258" fill="#8490b5" text-anchor="middle">Aug</text>
<text x="427.6" y="258" fill="#8490b5" text-anchor="middle">Sep</text>
<text x="519.7" y="258" fill="#8490b5" text-anchor="middle">Oct</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">percent</text>
<path d="M65.5 225.7 L87.0 197.9 L108.4 180.2 L129.9 155.6 L151.4 147.9 L172.9 126.9 L194.4 109.2 L215.9 90.8 L237.3 82.3 L258.8 80.1 L280.3 67.1 L301.8 53.9 L323.3 50.9 L344.7 66.0 L366.2 64.6 L387.7 54.8 L409.2 47.4 L430.7 42.2 L452.1 52.3 L473.6 71.6 L495.1 90.1 L516.6 104.7 L538.1 107.6 L559.6 122.8 L581.0 112.3 L602.5 113.2" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M65.5 231.0 L87.0 224.2 L108.4 215.9 L129.9 200.5 L151.4 190.1 L172.9 152.0 L194.4 123.7 L215.9 108.0 L237.3 54.5 L258.8 24.2 L280.3 16.0 L301.8 44.3 L323.3 45.3 L344.7 54.9 L366.2 52.9 L387.7 96.2 L409.2 117.3 L430.7 144.5 L452.1 175.2 L473.6 189.1 L495.1 201.3 L516.6 201.7 L538.1 218.3 L559.6 222.8 L581.0 222.8 L602.5 230.6" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>district-days under Hutton alert</span><span><i style="background:#c97c12"></i>outbreak-weeks that week, as a share of the busiest week</span></div>
<figcaption>When the alert is on and when the outbreaks come. The alert climbs to 80% of district-days by July, and the outbreaks peak in the same weeks.</figcaption>
</figure>

<figure class="robot-figure" data-chart="weeks-auc">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="How well each signal ranks the districts within a given week (AUC, 0.5 is a coin toss)" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" data-lines='{"w":640,"h":280,"pad":{"l":44,"r":16,"t":16,"b":40},"xmin":119,"xmax":308,"ymin":0.3,"ymax":1,"xname":"day of year","yfmt":"num","series":[{"name":"Hutton alert","color":"#e9e6dd","points":[[126,0.512],[133,0.659],[140,0.638],[147,0.606],[154,0.667],[161,0.653],[168,0.588],[175,0.574],[182,0.528],[189,0.568],[196,0.586],[203,0.552],[210,0.53],[217,0.583],[224,0.556],[231,0.524],[238,0.517],[245,0.527],[252,0.536],[259,0.447],[266,0.456],[273,0.554],[280,0.487],[287,0.46],[294,0.541],[301,0.589]]},{"name":"reports within 100 km","color":"#35a066","points":[[126,0.536],[133,0.677],[140,0.776],[147,0.825],[154,0.837],[161,0.758],[168,0.702],[175,0.758],[182,0.759],[189,0.759],[196,0.718],[203,0.704],[210,0.687],[217,0.643],[224,0.692],[231,0.673],[238,0.691],[245,0.688],[252,0.651],[259,0.641],[266,0.724],[273,0.676],[280,0.718],[287,0.543],[294,0.603],[301,0.651]]},{"name":"model: all","color":"#c561f6","points":[[126,0.811],[133,0.888],[140,0.9],[147,0.884],[154,0.911],[161,0.876],[168,0.863],[175,0.847],[182,0.827],[189,0.845],[196,0.832],[203,0.782],[210,0.749],[217,0.755],[224,0.793],[231,0.805],[238,0.777],[245,0.794],[252,0.833],[259,0.791],[266,0.866],[273,0.734],[280,0.743],[287,0.695],[294,0.637],[301,0.669]]}]}'>
<title>How well each signal ranks the districts within a given week (AUC, 0.5 is a coin toss)</title>
<line x1="44" x2="624" y1="176.0" y2="176.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="176.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.5</text>
<line x1="44" x2="624" y1="96.0" y2="96.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="96.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.75</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<text x="50.1" y="258" fill="#8490b5" text-anchor="middle">May</text>
<text x="145.3" y="258" fill="#8490b5" text-anchor="middle">Jun</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">Jul</text>
<text x="332.5" y="258" fill="#8490b5" text-anchor="middle">Aug</text>
<text x="427.6" y="258" fill="#8490b5" text-anchor="middle">Sep</text>
<text x="519.7" y="258" fill="#8490b5" text-anchor="middle">Oct</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="176.0" y2="176.0" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">AUC within the week</text>
<path d="M65.5 172.2 L87.0 125.1 L108.4 131.8 L129.9 142.1 L151.4 122.6 L172.9 127.0 L194.4 147.8 L215.9 152.3 L237.3 167.0 L258.8 154.2 L280.3 148.5 L301.8 159.4 L323.3 166.4 L344.7 149.4 L366.2 158.1 L387.7 168.3 L409.2 170.6 L430.7 167.4 L452.1 164.5 L473.6 193.0 L495.1 190.1 L516.6 158.7 L538.1 180.2 L559.6 188.8 L581.0 162.9 L602.5 147.5" fill="none" stroke="#e9e6dd" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M65.5 164.5 L87.0 119.4 L108.4 87.7 L129.9 72.0 L151.4 68.2 L172.9 93.4 L194.4 111.4 L215.9 93.4 L237.3 93.1 L258.8 93.1 L280.3 106.2 L301.8 110.7 L323.3 116.2 L344.7 130.2 L366.2 114.6 L387.7 120.6 L409.2 114.9 L430.7 115.8 L452.1 127.7 L473.6 130.9 L495.1 104.3 L516.6 119.7 L538.1 106.2 L559.6 162.2 L581.0 143.0 L602.5 127.7" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
<path d="M65.5 76.5 L87.0 51.8 L108.4 48.0 L129.9 53.1 L151.4 44.5 L172.9 55.7 L194.4 59.8 L215.9 65.0 L237.3 71.4 L258.8 65.6 L280.3 69.8 L301.8 85.8 L323.3 96.3 L344.7 94.4 L366.2 82.2 L387.7 78.4 L409.2 87.4 L430.7 81.9 L452.1 69.4 L473.6 82.9 L495.1 58.9 L516.6 101.1 L538.1 98.2 L559.6 113.6 L581.0 132.2 L602.5 121.9" fill="none" stroke="#c561f6" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"/>
</svg>
<div class="robot-legend"><span><i style="background:#e9e6dd"></i>Hutton alert</span><span><i style="background:#35a066"></i>reports within 100 km</span><span><i style="background:#c561f6"></i>model: all</span></div>
<figcaption>Skill inside a single week, with the calendar taken out. Through July and August the Hutton alert scores 0.52 to 0.59, while nearby reports stay above 0.65 and the full model above 0.75.</figcaption>
</figure>

<figure class="robot-figure fc-signals" aria-label="AUC of each signal on four outcomes: a report in the district within 7 days, in the district 7 to 21 days ahead, within 25 km within 7 days, within 25 km 7 to 21 days ahead.">
  <div class="fc-signal">
    <b><i style="background:#a93fe0"></i>the Hutton alert</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="the Hutton alert: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="55.5" height="12" rx="2" fill="#a93fe0" data-tip="<b>the Hutton alert</b>, district, 7 d<br>AUC 0.62, catches 84% at the Hutton alert rate, needs 61% of days for the Hutton catch rate"/><text x="137.5" y="12.5" fill="#e9e6dd" font-size="8.5">0.62</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="53.7" height="12" rx="2" fill="#a93fe0" data-tip="<b>the Hutton alert</b>, district, 7 to 21 d<br>AUC 0.60, catches 80% at the Hutton alert rate, needs 61% of days for the Hutton catch rate"/><text x="135.7" y="30.5" fill="#e9e6dd" font-size="8.5">0.60</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="54.9" height="12" rx="2" fill="#a93fe0" data-tip="<b>the Hutton alert</b>, 25 km, 7 d<br>AUC 0.61, catches 81% at the Hutton alert rate, needs 61% of days for the Hutton catch rate"/><text x="136.9" y="48.5" fill="#e9e6dd" font-size="8.5">0.61</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="53.3" height="12" rx="2" fill="#a93fe0" data-tip="<b>the Hutton alert</b>, 25 km, 7 to 21 d<br>AUC 0.59, catches 77% at the Hutton alert rate, needs 61% of days for the Hutton catch rate"/><text x="135.3" y="66.5" fill="#e9e6dd" font-size="8.5">0.59</text></svg>
    <span class="fc-signal-val">AUC 0.62 on the district week, 61% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">On or off, as issued.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#a93fe0"></i>Hutton days in 14</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="Hutton days in 14: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="62.0" height="12" rx="2" fill="#a93fe0" data-tip="<b>Hutton days in 14</b>, district, 7 d<br>AUC 0.69, catches 86% at the Hutton alert rate, needs 58% of days for the Hutton catch rate"/><text x="144.0" y="12.5" fill="#e9e6dd" font-size="8.5">0.69</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="58.6" height="12" rx="2" fill="#a93fe0" data-tip="<b>Hutton days in 14</b>, district, 7 to 21 d<br>AUC 0.65, catches 81% at the Hutton alert rate, needs 58% of days for the Hutton catch rate"/><text x="140.6" y="30.5" fill="#e9e6dd" font-size="8.5">0.65</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="60.1" height="12" rx="2" fill="#a93fe0" data-tip="<b>Hutton days in 14</b>, 25 km, 7 d<br>AUC 0.67, catches 83% at the Hutton alert rate, needs 59% of days for the Hutton catch rate"/><text x="142.1" y="48.5" fill="#e9e6dd" font-size="8.5">0.67</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="57.3" height="12" rx="2" fill="#a93fe0" data-tip="<b>Hutton days in 14</b>, 25 km, 7 to 21 d<br>AUC 0.64, catches 78% at the Hutton alert rate, needs 60% of days for the Hutton catch rate"/><text x="139.3" y="66.5" fill="#e9e6dd" font-size="8.5">0.64</text></svg>
    <span class="fc-signal-val">AUC 0.69 on the district week, 58% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">Counting qualifying days instead of the on/off flag helps a bit.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#4c5470"></i>the Smith Period</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="the Smith Period: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="55.0" height="12" rx="2" fill="#4c5470" data-tip="<b>the Smith Period</b>, district, 7 d<br>AUC 0.61, catches 71% at the Hutton alert rate, needs 80% of days for the Hutton catch rate"/><text x="137.0" y="12.5" fill="#e9e6dd" font-size="8.5">0.61</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="52.4" height="12" rx="2" fill="#4c5470" data-tip="<b>the Smith Period</b>, district, 7 to 21 d<br>AUC 0.58, catches 68% at the Hutton alert rate, needs 77% of days for the Hutton catch rate"/><text x="134.4" y="30.5" fill="#e9e6dd" font-size="8.5">0.58</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="52.3" height="12" rx="2" fill="#4c5470" data-tip="<b>the Smith Period</b>, 25 km, 7 d<br>AUC 0.58, catches 67% at the Hutton alert rate, needs 81% of days for the Hutton catch rate"/><text x="134.3" y="48.5" fill="#e9e6dd" font-size="8.5">0.58</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="50.4" height="12" rx="2" fill="#4c5470" data-tip="<b>the Smith Period</b>, 25 km, 7 to 21 d<br>AUC 0.56, catches 65% at the Hutton alert rate, needs 77% of days for the Hutton catch rate"/><text x="132.4" y="66.5" fill="#e9e6dd" font-size="8.5">0.56</text></svg>
    <span class="fc-signal-val">AUC 0.61 on the district week, 80% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">The 1956 rule it replaced. It would need 80% of days to catch what Hutton catches.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#c97c12"></i>week of the year</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="week of the year: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="62.9" height="12" rx="2" fill="#c97c12" data-tip="<b>week of the year</b>, district, 7 d<br>AUC 0.70, catches 90% at the Hutton alert rate, needs 51% of days for the Hutton catch rate"/><text x="144.9" y="12.5" fill="#e9e6dd" font-size="8.5">0.70</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="62.7" height="12" rx="2" fill="#c97c12" data-tip="<b>week of the year</b>, district, 7 to 21 d<br>AUC 0.70, catches 90% at the Hutton alert rate, needs 47% of days for the Hutton catch rate"/><text x="144.7" y="30.5" fill="#e9e6dd" font-size="8.5">0.70</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="61.8" height="12" rx="2" fill="#c97c12" data-tip="<b>week of the year</b>, 25 km, 7 d<br>AUC 0.69, catches 87% at the Hutton alert rate, needs 52% of days for the Hutton catch rate"/><text x="143.8" y="48.5" fill="#e9e6dd" font-size="8.5">0.69</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="61.5" height="12" rx="2" fill="#c97c12" data-tip="<b>week of the year</b>, 25 km, 7 to 21 d<br>AUC 0.68, catches 85% at the Hutton alert rate, needs 50% of days for the Hutton catch rate"/><text x="143.5" y="66.5" fill="#e9e6dd" font-size="8.5">0.68</text></svg>
    <span class="fc-signal-val">AUC 0.70 on the district week, 51% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">The calendar alone, learned from earlier seasons, beats the alert on every outcome.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#35a066"></i>nearby reports</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="nearby reports: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="71.5" height="12" rx="2" fill="#35a066" data-tip="<b>nearby reports</b>, district, 7 d<br>AUC 0.79, catches 92% at the Hutton alert rate, needs 44% of days for the Hutton catch rate"/><text x="153.5" y="12.5" fill="#e9e6dd" font-size="8.5">0.79</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="63.5" height="12" rx="2" fill="#35a066" data-tip="<b>nearby reports</b>, district, 7 to 21 d<br>AUC 0.71, catches 84% at the Hutton alert rate, needs 54% of days for the Hutton catch rate"/><text x="145.5" y="30.5" fill="#e9e6dd" font-size="8.5">0.71</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="72.3" height="12" rx="2" fill="#35a066" data-tip="<b>nearby reports</b>, 25 km, 7 d<br>AUC 0.80, catches 92% at the Hutton alert rate, needs 39% of days for the Hutton catch rate"/><text x="154.3" y="48.5" fill="#e9e6dd" font-size="8.5">0.80</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="64.4" height="12" rx="2" fill="#35a066" data-tip="<b>nearby reports</b>, 25 km, 7 to 21 d<br>AUC 0.72, catches 83% at the Hutton alert rate, needs 51% of days for the Hutton catch rate"/><text x="146.4" y="66.5" fill="#e9e6dd" font-size="8.5">0.72</text></svg>
    <span class="fc-signal-val">AUC 0.79 on the district week, 44% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">Reports nearby, weighted by distance and how recent they are. The best single signal.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#4c5470"></i>district history</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="district history: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="64.9" height="12" rx="2" fill="#4c5470" data-tip="<b>district history</b>, district, 7 d<br>AUC 0.72, catches 83% at the Hutton alert rate, needs 66% of days for the Hutton catch rate"/><text x="146.9" y="12.5" fill="#e9e6dd" font-size="8.5">0.72</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="64.3" height="12" rx="2" fill="#4c5470" data-tip="<b>district history</b>, district, 7 to 21 d<br>AUC 0.71, catches 82% at the Hutton alert rate, needs 51% of days for the Hutton catch rate"/><text x="146.3" y="30.5" fill="#e9e6dd" font-size="8.5">0.71</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="53.2" height="12" rx="2" fill="#4c5470" data-tip="<b>district history</b>, 25 km, 7 d<br>AUC 0.59, catches 71% at the Hutton alert rate, needs 76% of days for the Hutton catch rate"/><text x="135.2" y="48.5" fill="#e9e6dd" font-size="8.5">0.59</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="52.9" height="12" rx="2" fill="#4c5470" data-tip="<b>district history</b>, 25 km, 7 to 21 d<br>AUC 0.59, catches 70% at the Hutton alert rate, needs 70% of days for the Hutton catch rate"/><text x="134.9" y="66.5" fill="#e9e6dd" font-size="8.5">0.59</text></svg>
    <span class="fc-signal-val">AUC 0.72 on the district week, 66% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">How often this district reported in earlier seasons.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#4f9cf9"></i>weather model</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="weather model: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="67.8" height="12" rx="2" fill="#4f9cf9" data-tip="<b>weather model</b>, district, 7 d<br>AUC 0.75, catches 92% at the Hutton alert rate, needs 46% of days for the Hutton catch rate"/><text x="149.8" y="12.5" fill="#e9e6dd" font-size="8.5">0.75</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="66.5" height="12" rx="2" fill="#4f9cf9" data-tip="<b>weather model</b>, district, 7 to 21 d<br>AUC 0.74, catches 91% at the Hutton alert rate, needs 44% of days for the Hutton catch rate"/><text x="148.5" y="30.5" fill="#e9e6dd" font-size="8.5">0.74</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="66.1" height="12" rx="2" fill="#4f9cf9" data-tip="<b>weather model</b>, 25 km, 7 d<br>AUC 0.73, catches 89% at the Hutton alert rate, needs 48% of days for the Hutton catch rate"/><text x="148.1" y="48.5" fill="#e9e6dd" font-size="8.5">0.73</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="65.0" height="12" rx="2" fill="#4f9cf9" data-tip="<b>weather model</b>, 25 km, 7 to 21 d<br>AUC 0.72, catches 87% at the Hutton alert rate, needs 47% of days for the Hutton catch rate"/><text x="147.0" y="66.5" fill="#e9e6dd" font-size="8.5">0.72</text></svg>
    <span class="fc-signal-val">AUC 0.75 on the district week, 46% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">A model given only weather, with humid hours split by temperature and runs of humid nights.</span>
  </div>
  <div class="fc-signal">
    <b><i style="background:#c561f6"></i>everything</b>
    <svg viewBox="0 0 200 76" role="img" aria-label="everything: AUC on four outcomes"><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 d</text><rect x="78" y="3" width="77.2" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b>, district, 7 d<br>AUC 0.86, catches 96% at the Hutton alert rate, needs 30% of days for the Hutton catch rate"/><text x="159.2" y="12.5" fill="#e9e6dd" font-size="8.5">0.86</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">district, 7 to 21 d</text><rect x="78" y="21" width="75.7" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b>, district, 7 to 21 d<br>AUC 0.84, catches 95% at the Hutton alert rate, needs 28% of days for the Hutton catch rate"/><text x="157.7" y="30.5" fill="#e9e6dd" font-size="8.5">0.84</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 d</text><rect x="78" y="39" width="75.1" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b>, 25 km, 7 d<br>AUC 0.83, catches 94% at the Hutton alert rate, needs 34% of days for the Hutton catch rate"/><text x="157.1" y="48.5" fill="#e9e6dd" font-size="8.5">0.83</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">25 km, 7 to 21 d</text><rect x="78" y="57" width="73.2" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b>, 25 km, 7 to 21 d<br>AUC 0.81, catches 92% at the Hutton alert rate, needs 35% of days for the Hutton catch rate"/><text x="155.2" y="66.5" fill="#e9e6dd" font-size="8.5">0.81</text></svg>
    <span class="fc-signal-val">AUC 0.86 on the district week, 30% of days for the Hutton catch rate</span>
    <span class="fc-card-sub">Calendar, nearby reports, place and weather together.</span>
  </div>
</figure>

<details class="demo-box">
<summary><span class="demo-title">Four ways of asking the question</span><span class="demo-desc">AUC for each signal when the outcome is a report in the district within 7 days, in the district 7 to 21 days ahead (allowing for the delay between infection and report), within 25 km within 7 days, and within 25 km 7 to 21 days ahead.</span><span class="demo-open">open</span></summary>
<div class="demo-box-body">
<!-- TABLE:outcomes -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>signal or model</th><th class="num">district, 7 d</th><th class="num">district, 7 to 21 d</th><th class="num">25 km, 7 d</th><th class="num">25 km, 7 to 21 d</th></tr></thead>
<tbody>
<tr><td>Hutton alert as issued</td><td class="num">0.62</td><td class="num">0.60</td><td class="num">0.61</td><td class="num">0.59</td></tr>
<tr><td>Hutton days in the last 14 days</td><td class="num">0.69</td><td class="num">0.65</td><td class="num">0.67</td><td class="num">0.64</td></tr>
<tr><td>Smith periods in the last 28 days</td><td class="num">0.61</td><td class="num">0.58</td><td class="num">0.58</td><td class="num">0.56</td></tr>
<tr><td>week of the year</td><td class="num">0.70</td><td class="num">0.70</td><td class="num">0.69</td><td class="num">0.68</td></tr>
<tr><td>nearby reports</td><td class="num">0.79</td><td class="num">0.71</td><td class="num">0.80</td><td class="num">0.72</td></tr>
<tr><td>district history</td><td class="num">0.72</td><td class="num">0.71</td><td class="num">0.59</td><td class="num">0.59</td></tr>
<tr><td>weather model, basic features</td><td class="num">0.68</td><td class="num">0.64</td><td class="num">0.67</td><td class="num">0.64</td></tr>
<tr><td>weather model, rich features</td><td class="num">0.75</td><td class="num">0.74</td><td class="num">0.73</td><td class="num">0.72</td></tr>
<tr><td>calendar and nearby reports</td><td class="num">0.80</td><td class="num">0.76</td><td class="num">0.80</td><td class="num">0.75</td></tr>
<tr><td>calendar, reports and place</td><td class="num">0.85</td><td class="num">0.83</td><td class="num">0.83</td><td class="num">0.80</td></tr>
<tr><td>everything</td><td class="num">0.86</td><td class="num">0.84</td><td class="num">0.83</td><td class="num">0.81</td></tr>
</tbody></table></div>
</div>
</details>

<details class="demo-box">
<summary><span class="demo-title">By region and by season</span><span class="demo-desc">Where and when the alert does its job. Wales spends three days in four under alert; 2022 and 2024 were the seasons it caught least.</span><span class="demo-open">open</span></summary>
<div class="demo-box-body">
<!-- TABLE:regions -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>region</th><th class="num">outbreak-weeks</th><th class="num">alert on</th><th class="num">catch</th><th class="num">alert AUC</th><th class="num">model AUC</th><th class="num">days for the same catch</th></tr></thead>
<tbody>
<tr><td>England</td><td class="num">7,549</td><td class="num">61%</td><td class="num">81%</td><td class="num">0.60</td><td class="num">0.85</td><td class="num">28%</td></tr>
<tr><td>Scotland</td><td class="num">3,484</td><td class="num">54%</td><td class="num">86%</td><td class="num">0.66</td><td class="num">0.87</td><td class="num">30%</td></tr>
<tr><td>Wales</td><td class="num">1,326</td><td class="num">75%</td><td class="num">93%</td><td class="num">0.59</td><td class="num">0.85</td><td class="num">61%</td></tr>
</tbody></table></div>
<!-- TABLE:seasons -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>season</th><th class="num">outbreak-weeks</th><th class="num">alert on</th><th class="num">catch</th><th class="num">alert AUC</th><th class="num">model AUC</th></tr></thead>
<tbody>
<tr><td>2012</td><td class="num">1,823</td><td class="num">62%</td><td class="num">96%</td><td class="num">0.67</td><td class="num">0.87</td></tr>
<tr><td>2013</td><td class="num">378</td><td class="num">66%</td><td class="num">94%</td><td class="num">0.64</td><td class="num">0.85</td></tr>
<tr><td>2014</td><td class="num">1,403</td><td class="num">70%</td><td class="num">77%</td><td class="num">0.54</td><td class="num">0.83</td></tr>
<tr><td>2015</td><td class="num">357</td><td class="num">42%</td><td class="num">64%</td><td class="num">0.61</td><td class="num">0.86</td></tr>
<tr><td>2016</td><td class="num">1,035</td><td class="num">68%</td><td class="num">84%</td><td class="num">0.58</td><td class="num">0.82</td></tr>
<tr><td>2017</td><td class="num">961</td><td class="num">76%</td><td class="num">89%</td><td class="num">0.57</td><td class="num">0.82</td></tr>
<tr><td>2018</td><td class="num">369</td><td class="num">54%</td><td class="num">74%</td><td class="num">0.60</td><td class="num">0.83</td></tr>
<tr><td>2019</td><td class="num">1,188</td><td class="num">59%</td><td class="num">87%</td><td class="num">0.65</td><td class="num">0.87</td></tr>
<tr><td>2020</td><td class="num">471</td><td class="num">56%</td><td class="num">78%</td><td class="num">0.61</td><td class="num">0.83</td></tr>
<tr><td>2021</td><td class="num">1,202</td><td class="num">72%</td><td class="num">98%</td><td class="num">0.63</td><td class="num">0.89</td></tr>
<tr><td>2022</td><td class="num">434</td><td class="num">49%</td><td class="num">58%</td><td class="num">0.55</td><td class="num">0.80</td></tr>
<tr><td>2023</td><td class="num">998</td><td class="num">70%</td><td class="num">92%</td><td class="num">0.61</td><td class="num">0.89</td></tr>
<tr><td>2024</td><td class="num">1,392</td><td class="num">65%</td><td class="num">69%</td><td class="num">0.52</td><td class="num">0.87</td></tr>
<tr><td>2025</td><td class="num">383</td><td class="num">45%</td><td class="num">71%</td><td class="num">0.63</td><td class="num">0.90</td></tr>
</tbody></table></div>
</div>
</details>

Some things this can't say:

- The outcome is a scout's report, not an infection. Reports come one to three weeks after infection and nobody records the lag, so I also scored a 7 to 21 day window and the picture didn't change.
- Where there are no scouts there are no reports, so some of what "nearby reports" knows is where the scouts are. The same scouts get the Hutton alerts, so some detection is alert-led, which flatters the rule if anything.
- Station humidity interpolated to a district centroid isn't the humidity in a potato canopy. Reanalysis weather gave the same alert on 83% of days and the same story.
- Nothing here says growers could spray less. British blight programmes are preventive and weekly whatever the alert says, and no one measures unsprayed crops.
- The live outlook is a hindcast model pointed forwards. Its weather comes from a forecast rather than from stations, its "this season so far" score is on a handful of reports until the season is over, and if the scouts stop reporting the model goes quiet with them.

## What I took from it

Hover a bar for the numbers behind it.

<figure class="robot-figure fc-takeaways">
  <div class="fc-take">
    <b>61%</b>
    <span class="fc-card-sub">of season days are under a Hutton alert, so it catches 84% of outbreak-weeks mostly by being on. In Wales it is on three days in four.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="of season days are under a Hutton alert, so it catches 84% of outbreak-weeks mostly by being on. In Wales it is on three days in four."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">Scotland</text><rect x="78" y="3" width="48.3" height="12" rx="2" fill="#4c5470" data-tip="<b>Scotland</b><br>alert on 54% of days, catches 86%"/><text x="130.3" y="12.5" fill="#e9e6dd" font-size="8.5">54%</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">England</text><rect x="78" y="21" width="54.9" height="12" rx="2" fill="#4c5470" data-tip="<b>England</b><br>alert on 61% of days, catches 81%"/><text x="136.9" y="30.5" fill="#e9e6dd" font-size="8.5">61%</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">Wales</text><rect x="78" y="39" width="67.6" height="12" rx="2" fill="#c561f6" data-tip="<b>Wales</b><br>alert on 75% of days, catches 93%"/><text x="149.6" y="48.5" fill="#e9e6dd" font-size="8.5">75%</text></svg>
  </div>
  <div class="fc-take">
    <b>0.86</b>
    <span class="fc-card-sub">AUC for the full model against 0.62 for the alert. The calendar alone and nearby reports alone both beat the alert.</span>
    <svg viewBox="0 0 200 76" role="img" aria-label="AUC for the full model against 0.62 for the alert. The calendar alone and nearby reports alone both beat the alert."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">Hutton alert</text><rect x="78" y="3" width="55.5" height="12" rx="2" fill="#4c5470" data-tip="<b>the Hutton alert</b><br>AUC 0.62"/><text x="137.5" y="12.5" fill="#e9e6dd" font-size="8.5">0.62</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">week of year</text><rect x="78" y="21" width="62.9" height="12" rx="2" fill="#4c5470" data-tip="<b>week of the year</b><br>AUC 0.70"/><text x="144.9" y="30.5" fill="#e9e6dd" font-size="8.5">0.70</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">nearby reports</text><rect x="78" y="39" width="71.5" height="12" rx="2" fill="#4c5470" data-tip="<b>nearby reports</b><br>AUC 0.79"/><text x="153.5" y="48.5" fill="#e9e6dd" font-size="8.5">0.79</text><text x="72" y="66.5" fill="#8490b5" font-size="8.5" text-anchor="end">everything</text><rect x="78" y="57" width="77.2" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b><br>AUC 0.86"/><text x="159.2" y="66.5" fill="#e9e6dd" font-size="8.5">0.86</text></svg>
  </div>
  <div class="fc-take">
    <b>30%</b>
    <span class="fc-card-sub">of days under alert is what the full model needs to catch what the Hutton alert catches on 61%. About half the alerts, same catch.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="of days under alert is what the full model needs to catch what the Hutton alert catches on 61%. About half the alerts, same catch."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">Hutton alert</text><rect x="78" y="3" width="54.6" height="12" rx="2" fill="#4c5470" data-tip="<b>the Hutton alert</b><br>on 61% of days for a 84% catch"/><text x="136.6" y="12.5" fill="#e9e6dd" font-size="8.5">61%</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">weather model</text><rect x="78" y="21" width="41.0" height="12" rx="2" fill="#4c5470" data-tip="<b>weather model</b><br>46% of days for the same catch"/><text x="123.0" y="30.5" fill="#e9e6dd" font-size="8.5">46%</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">everything</text><rect x="78" y="39" width="26.9" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b><br>30% of days for the same catch"/><text x="108.9" y="48.5" fill="#e9e6dd" font-size="8.5">30%</text></svg>
  </div>
  <div class="fc-take">
    <b>+1</b>
    <span class="fc-card-sub">points of AUC is all the weather adds once the model knows the week, the nearby reports and the place. Better weather features help a weather-only model a lot, and the full model hardly at all.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="points of AUC is all the weather adds once the model knows the week, the nearby reports and the place. Better weather features help a weather-only model a lot, and the full model hardly at all."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">weather only</text><rect x="78" y="3" width="67.8" height="12" rx="2" fill="#4c5470" data-tip="<b>weather only, rich features</b><br>AUC 0.75 (basic features 0.68)"/><text x="149.8" y="12.5" fill="#e9e6dd" font-size="8.5">0.75</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">no weather</text><rect x="78" y="21" width="76.2" height="12" rx="2" fill="#4c5470" data-tip="<b>calendar, reports, place, no weather</b><br>AUC 0.85"/><text x="158.2" y="30.5" fill="#e9e6dd" font-size="8.5">0.85</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">everything</text><rect x="78" y="39" width="77.2" height="12" rx="2" fill="#c561f6" data-tip="<b>everything</b><br>AUC 0.86"/><text x="159.2" y="48.5" fill="#e9e6dd" font-size="8.5">0.86</text></svg>
  </div>
  <div class="fc-take">
    <b>95%</b>
    <span class="fc-card-sub">of reports had a Hutton period in the 28 days before, which reproduces the published 96%. It is the test the rule was given, and a rule on 61% of days cannot fail it.</span>
    <svg viewBox="0 0 200 40" role="img" aria-label="of reports had a Hutton period in the 28 days before, which reproduces the published 96%. It is the test the rule was given, and a rule on 61% of days cannot fail it."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">Smith</text><rect x="78" y="3" width="61.0" height="12" rx="2" fill="#4c5470" data-tip="<b>Smith Period</b><br>68% of reports had a Smith period in the prior 28 days"/><text x="143.0" y="12.5" fill="#e9e6dd" font-size="8.5">68%</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">Hutton</text><rect x="78" y="21" width="85.6" height="12" rx="2" fill="#c561f6" data-tip="<b>Hutton Criteria</b><br>95% here, 96.1% in Skelsey 2021"/><text x="167.6" y="30.5" fill="#e9e6dd" font-size="8.5">95%</text></svg>
  </div>
  <div class="fc-take">
    <b>0.55</b>
    <span class="fc-card-sub">is the alert's average within-week AUC through July and August (0.52 to 0.59), when it is on for 70 to 88% of days. In May and early June, on for a fifth of days, it does better.</span>
    <svg viewBox="0 0 200 58" role="img" aria-label="is the alert's average within-week AUC through July and August (0.52 to 0.59), when it is on for 70 to 88% of days. In May and early June, on for a fifth of days, it does better."><text x="72" y="12.5" fill="#8490b5" font-size="8.5" text-anchor="end">late May</text><rect x="78" y="3" width="54.5" height="12" rx="2" fill="#4c5470" data-tip="<b>week starting day 147</b><br>alert on 38% of days, within-week AUC 0.61"/><text x="136.5" y="12.5" fill="#e9e6dd" font-size="8.5">0.61</text><text x="72" y="30.5" fill="#8490b5" font-size="8.5" text-anchor="end">mid July</text><rect x="78" y="21" width="52.7" height="12" rx="2" fill="#4c5470" data-tip="<b>week starting day 196</b><br>alert on 77% of days, within-week AUC 0.59"/><text x="134.7" y="30.5" fill="#e9e6dd" font-size="8.5">0.59</text><text x="72" y="48.5" fill="#8490b5" font-size="8.5" text-anchor="end">late Aug</text><rect x="78" y="39" width="46.5" height="12" rx="2" fill="#c561f6" data-tip="<b>week starting day 238</b><br>alert on 86% of days, within-week AUC 0.52"/><text x="128.5" y="48.5" fill="#e9e6dd" font-size="8.5">0.52</text></svg>
  </div>
</figure>

I went looking for a better humidity rule and there is one, worth six points of AUC to a weather-only warning, but it isn't the story. The story is that from late June a warm humid night is the normal state of a British summer, so a rule that fires on warm humid nights fires all the time, and the information that would sharpen it (the week, and what the scouts have already found nearby) is public and sitting on the same website as the alert. Running the model each morning cost an afternoon; whether it earns a place next to the red dot is for the next season to say.

<script src="/sim/blight-core.js" data-astro-rerun></script>
<script src="/sim/blight-data.js" data-astro-rerun></script>
<script src="/sim/blight.js" data-astro-rerun></script>
<script src="/sim/blight-live.js" data-astro-rerun></script>
<style>
  .sheepdog { margin: 1.5rem 0; }
  .bl-canvas { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid var(--gray-800); background: var(--gray-999_40); margin-top: 0.6rem; }
  .bl-map { max-width: 640px; margin-left: auto; margin-right: auto; }
  .bl-days button.on { border-color: var(--accent-dark); color: var(--accent-dark); }
  .bl-rules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem 1.2rem; margin-top: 0.7rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  @media (max-width: 560px) { .bl-rules { grid-template-columns: minmax(0, 1fr); } }
  .bl-rules label { display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
  .bl-rules input[type="range"] { flex: 1; min-width: 0; accent-color: var(--accent-dark); }
  .bl-rules span { min-width: 3.2em; color: var(--gray-0); }
  .bl-day { display: block; width: 100%; margin-top: 0.4rem; accent-color: var(--accent-dark); }
  .bl-bars { display: grid; gap: 0.35rem; margin-top: 0.8rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .bl-bar { display: grid; grid-template-columns: 11rem minmax(0, 1fr) 4rem; gap: 0.6rem; align-items: center; }
  @media (max-width: 560px) { .bl-bar { grid-template-columns: 8rem minmax(0, 1fr) 3.5rem; } }
  .bl-bar-track { display: block; height: 10px; border-radius: 999px; background: var(--gray-800); overflow: hidden; }
  .bl-bar-track i { display: block; height: 100%; width: 0; border-radius: 999px; transition: width 0.12s linear; }
  .bl-bar-val { color: var(--gray-0); text-align: right; }
  .bl-bar-p { margin-top: 0.4rem; padding-top: 0.5rem; border-top: 1px solid var(--gray-800); }
  .bl-bar-p .bl-bar-label { color: var(--gray-0); }
  .bl-badge { padding: 0.15rem 0.6rem; border-radius: 999px; font-family: var(--font-mono); font-size: var(--text-sm); border: 1px solid var(--gray-700); color: var(--gray-400); }
  .bl-badge.on { color: var(--accent-dark); border-color: var(--accent-dark); }
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
  .fc-flow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 640px) { .fc-flow { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .fc-step { position: relative; border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.25rem; }
  .fc-step b { font-family: var(--font-brand); font-size: 1.9rem; line-height: 1.1; color: var(--accent-dark); }
  .fc-step span { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.45; }
  .fc-step:not(:last-child)::after { content: "→"; position: absolute; right: -0.85rem; top: 1rem; color: var(--gray-500); font-size: 1.1rem; }
  .fc-step-tally { border-style: dashed; }
  .fc-step-tally b { color: var(--gray-0); }
  @media (max-width: 640px) { .fc-step:not(:last-child)::after { content: none; } }
  .fc-methods { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 640px) { .fc-methods { grid-template-columns: minmax(0, 1fr); } }
  .fc-methods > div { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; }
  .fc-methods b { font-family: var(--font-brand); font-size: 1.1rem; color: var(--gray-0); }
  .fc-methods span { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.5; }
  .fc-signals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 860px) { .fc-signals { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .fc-signals { grid-template-columns: minmax(0, 1fr); } }
  .fc-signal { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.8rem 0.9rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
  .fc-signal > b { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--gray-0); display: flex; align-items: center; gap: 0.4rem; }
  .fc-signal > b i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; flex: none; }
  .fc-signal svg { display: block; width: 100%; height: auto; }
  .robot-figure.fc-signals .fc-signal rect[data-tip].fc-hot { stroke: none; }
  .fc-signal-val { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .fc-takeaways { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0 0; }
  @media (max-width: 860px) { .fc-takeaways { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .fc-takeaways { grid-template-columns: minmax(0, 1fr); } }
  .fc-take { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
  .fc-take > b { font-family: var(--font-brand); font-size: 1.9rem; line-height: 1.1; color: var(--accent-dark); }
  .fc-take svg { display: block; width: 100%; height: auto; margin-top: auto; padding-top: 0.4rem; }
  .fc-take svg text { font-family: var(--font-mono); }
  .fc-take rect[data-tip] { cursor: default; }
  .fc-compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0; }
  @media (max-width: 640px) { .fc-compare { grid-template-columns: minmax(0, 1fr); } }
  .fc-card { border: 1px solid var(--gray-800); border-radius: 0.75rem; padding: 0.9rem 1rem; background: var(--gray-999_40); display: flex; flex-direction: column; gap: 0.4rem; }
  .fc-card > b { font-family: var(--font-brand); font-size: 1.2rem; color: var(--gray-0); }
  .fc-card-sub { font-size: var(--text-sm); color: var(--gray-300); line-height: 1.45; }
  .fc-tip { position: fixed; z-index: 50; pointer-events: none; max-width: 24rem; padding: 0.45rem 0.65rem; border: 1px solid var(--gray-700); border-radius: 0.5rem; background: rgba(9,11,17,0.96); color: var(--gray-200); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.5; }
  .fc-tip b { color: var(--gray-0); }
  .fc-tip i { display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin: 0 0.4rem 0.2rem 0; }
  .fc-tip-x { display: block; color: var(--gray-400); margin-bottom: 0.15rem; }
  .robot-figure rect[data-tip].fc-hot, .robot-figure circle[data-tip].fc-hot { stroke: #fff; stroke-width: 2; }
  .robot-figure svg { touch-action: pan-y; }
  .fc-tally { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
  .sheepdog-hud { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .sheepdog-hud b { color: var(--gray-0); }
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

*The research behind this is its own repo, [blight-forecast](https://github.com/samllbrown/blight-forecast): outbreak cleaning, station interpolation, the district-day panel and the season-forward fits. The numbers on this page come from its export through one script on the same code as the demos: [experiment script](https://github.com/samllbrown/samuellbrown.dev/blob/main/scripts/blight-experiments.mjs) · [demo code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/blight.js). The live outlook is [blightcast.live](https://github.com/samllbrown/blight-forecast/blob/master/src/blightcast/live.py) run by a [daily action](https://github.com/samllbrown/blight-forecast/blob/master/.github/workflows/live.yml), weather from [Open-Meteo](https://open-meteo.com/). The rules: [Smith 1956](https://doi.org/10.1002/j.1477-8696.1956.tb00304.x) and the Hutton Criteria ([Dancey, Skelsey and Cooke 2017](https://euroblight.net/fileadmin/euroblight/Workshops/AArhus/Proceedings/5._Siobhan_Dancy-p53-58.pdf)); the only other evaluation is [Skelsey 2021](https://doi.org/10.1094/PHYTO-05-20-0185-R). Data: the [Fight Against Blight](https://blight.hutton.ac.uk/) outbreak record (James Hutton Institute), [Meteostat](https://meteostat.net/) station archives, and [BlightSpy](https://blightspy.huttonltd.com/) for what growers see.*
