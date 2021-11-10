// https://observablehq.com/@d3/hexbin-map@190
import define1 from "./legend.js";
import define2 from "./scrubber.js";

export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map([["poi.tsv",new URL("./files/poi_scaledsig.tsv",import.meta.url)],["topoJSON-Ireland.json",new URL("./files/topoJSON-Ireland.json",import.meta.url)]]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], function(md){return(
md`### Estimated Accommodation Suppply around Points of Interest Listed by Fáilte Ireland`
)});
  main.variable(observer("viewof min_popularity")).define("viewof min_popularity", ["Scrubber"], function(Scrubber){return(
Scrubber([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], {autoplay: false, loop: false})
)});
  main.variable(observer("min_popularity")).define("min_popularity", ["Generators", "viewof min_popularity"], (G, _) => G.input(_));
  main.variable(observer("chart")).define("chart", ["d3","currentData","width","height","legend","color","topojson","us","hexbin","radius","projection"], function(d3,currentData,width,height,legend,color,topojson,us,hexbin,radius,projection)
{
  const svg = d3.create("svg")
      .attr("viewBox", [70, 20, width/1.3, height/1.3]);

  const ticksInclusiveRange = [...color.domain()];
  ticksInclusiveRange[1] += 1;
  const plot_legend = svg.append("g")
    .attr("transform", "translate(650, 70)")
    .append(() => legend({
      color: color, 
      title: currentData.title, 
      width: 200,
      tickValues: d3.range(...ticksInclusiveRange)
    }));

  svg.append("path")
    .datum(topojson.mesh(us, us.objects.states))
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-width", 0.2)
    .attr("stroke-linejoin", "round")
    .attr("d", d3.geoPath().projection(projection));

  const plot_hexbins = svg.append("g")
    .selectAll("path")
    .data(currentData)
    .join("path")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("d", d => hexbin.hexagon(radius(d.length)))
      .attr("fill", d => color(d.accommodationSupplyIndex))
      .attr("stroke", d => d3.lab(color(d.accommodationSupplyIndex)).darker())
    .append("title")
      .text(d => `Points of interest: ${d.length}
Accomodation supply level: ${d.accommodationSupplyIndex}`);

  return svg.node();
}
);
  main.variable(observer("currentData")).define("currentData", ["d3","FileAttachment","min_popularity","projection","calcAccommodationSupplyIndex","hexbin"], async function(d3,FileAttachment,min_popularity,projection,calcAccommodationSupplyIndex,hexbin)
{
  const data = d3.tsvParse(await FileAttachment("poi.tsv").text(), d => {
    const p = projection(d);
    p.type = d.type;
    p.scaled_sig = parseInt(d.scaled_sig);
    return p;
  }).filter(d =>  d.scaled_sig/10 >= min_popularity);
  return Object.assign(
    hexbin(data)
      .map(d => calcAccommodationSupplyIndex(d))
      .sort((a, b) => b.length - a.length),
    {title: "Accommodation Supply Level"}
  );
}
);
  main.variable(observer("projection")).define("projection", ["d3","width","height","topojson","us"], function(d3,width,height,topojson,us){
    const featureCollection = topojson.feature(us, us.objects.states);
    return(
d3.geoEquirectangular().fitExtent([[70, 20], [width/1.3, height/1.3]], featureCollection)
)});
  main.variable(observer("calcAccommodationSupplyIndex")).define("calcAccommodationSupplyIndex", [], function(){return(
    function(bin) {
      bin.accommodationSupplyIndex = (Math.round(bin.filter(d => d.type!='accommodation').length / bin.length * 10.)) - 5.;
      return bin
    }
)});
  main.variable(observer("color")).define("color", ["d3","currentData"], function(d3,currentData){return(
d3.scaleSequential(d3.extent(currentData, d => d.accommodationSupplyIndex), d3.interpolateSpectral)
)});
  main.variable(observer("radius")).define("radius", ["d3","currentData","hexbin"], function(d3,currentData,hexbin){return(
d3.scaleSqrt([0, d3.max(currentData, d => d.length)], [1.25, hexbin.radius() * Math.SQRT2])
)});
  main.variable(observer("hexbin")).define("hexbin", ["d3","width","height"], function(d3,width,height){return(
d3.hexbin().extent([[70,20], [width/1.3, height/1.3]]).radius(25)
)});
  main.variable(observer("width")).define("width", function(){return(
1024
)});
  main.variable(observer("height")).define("height", function(){return(
768)});
  main.variable(observer("us")).define("us", ["FileAttachment"], function(FileAttachment){return(
FileAttachment("topoJSON-Ireland.json").json()
)});
  main.variable(observer("topojson")).define("topojson", ["require"], function(require){return(
require("topojson-client@3")
)});
  main.variable(observer("d3")).define("d3", ["require"], function(require){return(
require("d3@6", "d3-hexbin@0.2")
)});
  const child1 = runtime.module(define1);
  main.import("Scrubber", child1);
  const child2 = runtime.module(define2);
  main.import("legend", child2);
  return main;
}
