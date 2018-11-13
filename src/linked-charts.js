(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.lc = {})));
}(this, (function (exports) { 'use strict';

function base() {
	
  var obj = {};
  obj.propList = [];

  obj.add_property = function( propertyName, defaultValue, typeCheck ) {
    //save the name of the property
    obj.propList.push(propertyName);
		
    var getter = "get_" + propertyName;

    //define the setter
    obj[ propertyName ] = function( vf ) {
      //if value is not defined, consider this a getter call
      if( vf === undefined )
        return obj[ getter ]();

      if(typeof typeCheck === "function")
         vf = typeCheck(vf);
      //if value is a function replace the getter with it,
      //otherwise replace getter with a function that returns this value
      if( typeof(vf) === "function" )
        obj[ getter ] = vf;
      else 
        obj[ getter ] = function() { return vf };

      //setter always returns chart, never layer
      if(obj.layers)
        return obj
      else
        if(obj.chart)
          return obj.chart
        else
          return obj;
    };

    //define a getter
		if(typeof defaultValue === "function")
			obj[ getter ] = defaultValue;
		else
			obj[ getter ] = function() { return defaultValue };
    return obj;
  };

  //wraps a setter using the provided wrapper function
  obj.wrapSetter = function(propertyName, wrapper){
    if(typeof wrapper !== "function")
      throw "Error in 'wrapSetter': wrapper is not a function."
    if(obj.propList.indexOf(propertyName) == -1)
      throw "Error in 'wrapSetter': this object doesn't have " + propertyName +
        " property";

    var oldSetter = obj[propertyName];
    obj[propertyName] = function(){
      //if no arguments were passed return the getter value
      if(arguments.length == 0)
        return obj["get_" + propertyName]();

      //otherwise run the wrapped setter
     return wrapper(oldSetter).apply(obj, arguments);
    };
    
    return obj;
  };
	
	return obj;
}

function cache( f ) {
  var the_cache = {};
  return function() {
    if( arguments[0] === "clear" ) {
      the_cache = {};
      return undefined;
    }
    if( !( arguments in Object.keys(the_cache) ) &&
			!(arguments.length == 0 && Object.keys(the_cache).length != 0))
      the_cache[arguments] = f.apply( undefined, arguments );
    return the_cache[arguments];
  }
}

function separateBy(data, properties, type){
  if(typeof data !== "object")
    throw "Error in function 'separateBy': first argument is not an object";
  
  //check if data is an object or an array
  var type;
  data.length === undefined ? type = "obj" : type = "arr";

  if(typeof properties === "number" || typeof properties === "string")
    properties = [properties];
  //turn "properities" into an array and throw an Error if this isn't possible
  if(typeof properties.length === "undefined")
    throw "Error in function 'separateBy': " + properties.toString() +
          " is not a property name"; 

  //end of a recursive function. There are no more properties to
  //separate by
  if(properties.length == 0)
    return data;

  var newData = {}, uniqueList = [], keys, value;
  //if data is an array, keys = ["0", "1", "2", ...]
  var keys = Object.keys(data);

/*  //go through all elements to find all possible values of the selected property
  for(var i = 0; i < keys.length; i++){
    if(typeof data[keys[i]][properties[0]] !== "undefined" &&
      uniqueList.indexOf(data[keys[i]][properties[0]]) == -1
    )
      uniqueList.push(data[keys[i]][properties[0]]);
  } */

  //if none of the objects have this property, continue with the next step
  //of the recursion
  var found = false, i = 0;
  while(!found && i < keys.length) {
    if(data[keys[i]][properties[0]] !== "undefined")
      found = true;
    i++;
  }
  if(!found) {
    properties.shift();
    return separateBy(data, properties)
  }

  //otherwise initialize properties of the new object
  //for(var i = 0; i < uniqueList.length; i++)
  //  type == "obj" ? newData[uniqueList[i]] = {} : newData[uniqueList[i]] = [];

  //go through all the elements again and place them in a suitable category
  var newElement;
  for(var i = 0; i < keys.length; i++){
    value = data[keys[i]][properties[0]];
    if(value !== undefined) {
      newElement = {};
      Object.assign(newElement, data[keys[i]]);
      delete newElement[properties[0]];
      if(newData[value] === undefined)
        type == "obj" ? newData[value] = {} : newData[value] = [];

      if(type == "obj") newData[value][keys[i]] = {};
      type == "obj" ? newData[value][keys[i]] = newElement :
                      newData[value].push(newElement);
    }
  }
  //if type is array but all values of the property are unique change arrays in objects
  //May be this should be optional
  if(type == "arr") {
    var change = true, i = 0,
    newProperties = Object.keys(newData);
    while(change && i < newProperties.length) {
      change = (newData[newProperties[i]].length == 1);
      i++;
    }
    if(change){
      var a;
      for(var i = 0; i < newProperties.length; i++){
        a = {};
        Object.assign(a, newData[newProperties[i]][0]);
        newData[newProperties[i]] = {};
        Object.assign(newData[newProperties[i]], a);
      }
    }
  }
  //Now go through all the properties of the new object and call this function
  //recursively
  properties.shift();
  
  for(var i = 0; i < newProperties.length; i++)
    newData[newProperties[i]] = separateBy(newData[newProperties[i]], properties.slice());
  return newData;
}

function getEuclideanDistance(a, b) {
	if(a.length != b.length)
		throw "Error in getEuclideanDistance: length of the" +
			"input vectors is not the same";
	var sum = 0;
	for(var i = 0; i < a.length; i++)
		sum += (a[i] - b[i]) * (a[i] - b[i]);
	
	return Math.sqrt(sum);
}

function add_click_listener(chart){

  var wait_dblClick = null, down, wait_click = null,
    tolerance = 5, click_coord, downThis,
    pacer = call_pacer(100), panStarted = false;
 
  //add a transparent rectangle to detect clicks
  //and make changes to update function
  chart.svg.selectAll(".plotArea").append("rect")
    .attr("class", "clickPanel")
    .attr("fill", "transparent")
    .lower();
  var inherited_updateSize = chart.updateSize;
  
  chart.updateSize = function(){
    inherited_updateSize();
     chart.svg.selectAll(".clickPanel")
      .attr("width", chart.plotWidth())
      .attr("height", chart.plotHeight());
    return chart;
  };

  var on_mousedown = function(){
    //remove all the hints if there are any
    chart.container.selectAll(".hint")
      .remove();

    down = d3.mouse(document.body);
    downThis = d3.mouse(this);
    wait_click = window.setTimeout(function() {wait_click = null;}, 1000);
    var p = d3.mouse(this);  //Mouse position on the heatmap
    if(!chart.pan("mode"))
      chart.svg.selectAll(".plotArea").append("rect")
        .attr("class", "selection")
        .attr("x", p[0])
        .attr("y", p[1])
        .attr("width", 1)
        .attr("height", 1);
    if(chart.pan("mode")){
      panStarted = true;
      chart.pan("down", downThis);
      chart.transitionOff = true;
    }
    chart.container.selectAll(".inform")
      .classed("blocked", true);

    document.addEventListener("mousemove", on_mousemove, false);

    document.addEventListener("mouseup", on_mouseup, false);
  };
  var wait = false;
  var on_mousemove = function(e){
    var s = chart.svg.select(".selection"),
      rect = chart.svg.select(".clickPanel").node().getBoundingClientRect(),
      p = [d3.max([d3.min([e.clientX - rect.left, chart.plotWidth()]), 0]), 
            d3.max([d3.min([e.clientY - rect.top, chart.plotHeight()]), 0])]; 
        
    if(panStarted){
      if(!wait){
        wait = true;
        setTimeout(function() {wait = false;}, 100);
        chart.panMove(p);
      }
      return;
    }

    if(!s.empty()) {
      s.attr("x", d3.min([p[0], downThis[0]]))
        .attr("y", d3.min([downThis[1], p[1]]))
        .attr("width", Math.abs(downThis[0] - p[0]))
        .attr("height", Math.abs(downThis[1] - p[1]));
      
    var shadow = chart.svg.select(".shadow");

    if(shadow.empty() && 
          Math.abs((downThis[0] - p[0]) * (downThis[1] - p[1])) > 10)
      shadow = chart.svg.selectAll(".plotArea").append("path")
        .attr("class", "shadow")
        .attr("fill", "#444")
        .attr("opacity", 0.6);

    shadow
      .attr("d", "M 0 0" + 
                " h " + chart.plotWidth() + 
                " v " + chart.plotHeight() + 
                " h -" + chart.plotWidth() + 
                " v -" + chart.plotHeight() +
                " M " + s.attr("x") + " " + s.attr("y") + 
                " v " + s.attr("height") +
                " h " + s.attr("width") +
                " v -" + s.attr("height") +                  
                " h -" + s.attr("width")); 
     // .lower();
     return;
    }

    var canvases = [];
    chart.container.selectAll("canvas")
      .filter(function() {return d3.select(this).classed("active")})
      .each(function() {canvases.push(d3.select(this).attr("id"));});

    if(canvases.length > 0) {
      pacer.do(function(){
        var elements = chart.findElements(p, p);
        if(Array.isArray(elements)) {
          //this is a heatmap in a canvas mode
          if(elements.length == 0) {
            chart.get_on_mouseout();
            return;
          }

          chart.container.selectAll(".inform")
            .style("left", (p[0] + 10 + chart.margins().left) + "px")
            .style("top", (p[1] + 10 + chart.margins().top) + "px")
            .select(".value")
              .html(function() {return chart.get_informText(elements[0][0], elements[0][1])});
        } else {
          //one of the layers is in canvas mode
          var i = Object.keys(elements).length,
            flag = true, layerId;

          while(flag && i > 0) {
            i--;
            layerId = Object.keys(elements)[i]; 
            flag = (elements[layerId].length == 0);
          }
          if(!flag && canvases.indexOf(layerId) != -1)
            d3.customEvent(e, chart.get_layer(layerId).get_on_mouseover, this, [elements[layerId][elements[layerId].length - 1]]);
            //chart.get_layer(layerId).get_on_mouseover(elements[layerId][0]);
          if(flag && chart.get_on_mouseout)
            chart.get_layer(layerId).get_on_mouseout();
        }

      });
    }
  };

  var on_mouseup = function(e) {
 
    var rect = chart.svg.select(".clickPanel").node().getBoundingClientRect(),
      pos = [d3.max([d3.min([e.clientX - rect.left, chart.plotWidth()]), 0]), 
            d3.max([d3.min([e.clientY - rect.top, chart.plotHeight()]), 0])];
    d3.event = e;

    var mark = d3.event.shiftKey || chart.selectMode();
    // remove selection frame
    chart.container.selectAll(".inform")
      .classed("blocked", false);

    if(!chart.svg.select("rect.selection").empty())
      var x = +chart.svg.selectAll("rect.selection").attr("x"),
        y = +chart.svg.selectAll("rect.selection").attr("y"),
        w = +chart.svg.selectAll("rect.selection").attr("width"),
        h = +chart.svg.selectAll("rect.selection").attr("height"),
        lu = [x, y], 
        rb = [x + w, y + h];
    
    var elements = chart.svg.selectAll(".plotArea");
    
    chart.svg.selectAll("rect.selection").remove();
    chart.svg.select(".shadow").remove();

    if(wait_click && getEuclideanDistance(down, d3.mouse(document.body)) < tolerance){
      window.clearTimeout(wait_click);
      wait_click = null;
      if(wait_dblClick && 
        getEuclideanDistance(click_coord, d3.mouse(document.body)) < tolerance
      ){
        window.clearTimeout(wait_dblClick);
        wait_dblClick = null;
        elements.on("dblclick").apply(elements, [mark]);
      } else {
        wait_dblClick = window.setTimeout((function(e) {
          return function() {
            elements.on("click").call(elements, pos, mark);
            wait_dblClick = null;
            if(panStarted) {
              panStarted = false;
              chart.panMove(pos);
              chart.container.selectAll(".inform").classed("blocked", false);
              chart.transitionOff = false;
              return;
            }          
          };
        })(d3.event), 300);
      }
      click_coord = d3.mouse(document.body);
      return;
    }

    if(panStarted) {
      panStarted = false;
      chart.panMove(pos);
      chart.container.selectAll(".inform").classed("blocked", false);
      chart.transitionOff = false;
      return;
    }

    // remove temporary selection marker class
    if(lu)
      if(mark)
        chart.mark(chart.findElements(lu, rb));
      else 
        chart.zoom(lu, rb);

    document.onmousemove = null;
    document.onmouseup = null;      
  };
  var on_dblclick = function(mark){
    mark ? chart.mark("__clear__") : chart.resetDomain();
  };
  var on_panelClick = function(p, mark){
    //if this function wasn't called throug timers and 
    //therefore didn't get position as arguement, ignore
    if(typeof p === "undefined")
      return;

    //find all the points that intersect with the cursor position
    var clicked = chart.findElements(p, p);
    if(clicked.length == 0)
      return;

    if(mark){
      chart.mark(clicked);
      return;      
    }

    //if we are in canvas mode, on_click can't be called the usual way
    //there are no 'data_elements' to select
    var canvases = [];
    chart.container.selectAll("canvas")
      .filter(function() {return d3.select(this).classed("active")})
      .each(function() {canvases.push(d3.select(this).attr("id"));});

    if(canvases.length > 0) 
      if(Array.isArray(clicked)) {
          //this is a heatmap in a canvas mode
          chart.get_on_click(clicked[0], clicked[1]);
          return;
        } else {
          //one of the layers is in canvas mode
          var i = Object.keys(clicked).length,
            flag = true, layerId;

          while(flag && i > 0) {
            i--;
            layerId = Object.keys(clicked)[i]; 
            if(clicked[layerId].length != 0) {
              if(chart.clickSingle()) {
                flag = false;
                d3.customEvent(d3.event, chart.get_layer(layerId).get_on_click, this, [clicked[layerId][0]]);
              } else {
                for(var j = 0; j < clicked[layerId].length; j++)
                  d3.customEvent(d3.event, chart.get_layer(layerId).get_on_click, this, [clicked[layerId][j]]);
              }
            }
          }

          return;
        }
    
    var clickedElements = chart.get_elements(clicked),
      activeElement = clickedElements.filter(function(d){
        return d == chart.container.selectAll(".inform").datum();
      });
    if(!activeElement.empty())
      clickedElements = activeElement;

    if(chart.clickSingle())
      clickedElements = d3.select(clickedElements.node());

    var clickFun;
    clickedElements.each(function(d){
      clickFun = d3.select(this).on("click");
      clickFun.call(this, d);
    });
  };

  chart.svg.selectAll(".plotArea")
    .on("mousedown", on_mousedown, true)
    //.on("mousemove", on_mousemove, true)
    //.on("mouseup", on_mouseup, true)
    .on("dblclick", on_dblclick, true)
    .on("click", on_panelClick, true);
  
  chart.container.node().addEventListener("mousemove", on_mousemove, false);

  return chart;
}

function pearsonCorr( v1, v2 ) {
   var sum1 = 0;
   var sum2 = 0;
   for( var i = 0; i < v1.length; i++ ) {
      sum1 += v1[i];
      sum2 += v2[i];
   }
   var mean1 = sum1 / v1.length;
   var mean2 = sum2 / v2.length;
   var cov = 0;
   var var1 = 0;
   var var2 = 0;
   for( var i = 0; i < v1.length; i++ ) {
      cov += ( v1[i] - mean1 ) * ( v2[i] - mean2 );
      var1 += ( v1[i] - mean1 ) * ( v1[i] - mean1 );
      var2 += ( v2[i] - mean2 ) * ( v2[i] - mean2 );
   } 
   return cov / Math.sqrt( var1 * var2 );
} 

function wrapText(text, width, height, minSize, maxSize, fontRatio){
  var splitBy = function(text, symbol){
    var spl = text.split(symbol);
    if(spl[spl.length - 1] == "")
      spl.pop();
    if(spl.length == 1) return;
    var mult = 0, bestSep, leftSide = 0,
      rightSide = text.length;
    for(var i = 0; i < spl.length - 1; i++){
      leftSide += (spl[i].length + 1);
      rightSide -= (spl[i].length + 1);
      if(mult < leftSide * rightSide){
        mult = leftSide *  rightSide;
        bestSep = i;
      }
    }
    return [spl.slice(0, bestSep + 1).join(symbol) + symbol, 
            spl.slice(bestSep + 1, spl.length - bestSep).join(symbol)];
  };

  var splitByVowel = function(text){
    var vowelInd = Array.apply(null, Array(text.length)).map(Number.prototype.valueOf,0),
      vowels = ["a", "A", "o", "O", "e", "E", "u", "U", "i", "I"];
    
    for(var i = 0; i < text.length; i++)
      if(vowels.indexOf(text[i]) != -1)
        vowelInd[i] = 1;
    for(var i = 0; i < vowelInd.length - 1; i++)
      vowelInd[i] = (vowelInd[i] - vowelInd[i + 1]) * vowelInd[i];
    vowelInd[vowelInd.length - 1] = 0;
    vowelInd[vowelInd.length - 2] = 0;
    if(vowelInd.indexOf(1) == -1)
      return [text.substring(0, Math.ceil(text.length / 2)) + "-", 
              text.substring(Math.ceil(text.length / 2))];
    var mult = 0, bestSep;
    for(var i = 0; i < text.length; i++)
      if(vowelInd[i] == 1)
        if(mult < (i + 2) * (text.length - i - 1)){
          mult = (i + 2) * (text.length - i - 1);
          bestSep = i;
        }

      return [text.substring(0, bestSep + 1) + "-", 
              text.substring(bestSep + 1)];
  };

  if(typeof minSize === "undefined")
    minSize = 8;
  if(typeof maxSize === "undefined")
    maxSize = 13;
  if(typeof fontRatio === "undefined")
    fontRatio = 0.6;
  var fontSize = d3.min([height, maxSize]),
    spans = [text], maxLength = text.length,
    allowedLength, longestSpan = 0;

  while(maxLength * fontSize * fontRatio > width && fontSize >= minSize){
    if(maxLength == 1)
      fontSize = width / fontRatio * 0.95;
    else {
      if(height / (spans.length + 1) < width / (maxLength * fontRatio) * 0.95)
        fontSize = width / (maxLength * fontRatio) * 0.95;
      else {
        var charachters = [" ", ".", ",", "/", "\\", "-", "_", "+", "*", "&", "(", ")", "?", "!"],
          spl, i = 0;
        while(typeof spl === "undefined" && i < charachters.length){
          spl = splitBy(spans[longestSpan], charachters[i]);
          i++;
        }
        if(typeof spl === "undefined")
          spl = splitByVowel(spans[longestSpan]);
        spans.splice(longestSpan, 1, spl[0], spl[1]);

        allowedLength = Math.floor(width / (fontSize * fontRatio));

        for(var i = 0; i < spans.length - 1; i++)
          if(spans[i].length + spans[i + 1].length <= allowedLength &&
              spans[i].length + spans[i + 1].length < maxLength){
            spans.splice(i, 2, spans[i] + spans[i + 1]);
            fontSize = d3.min([height / (spans.length - 1), maxSize]);
            allowedLength = Math.floor(width / (fontSize * fontRatio));
          }

        fontSize = d3.min([height / spans.length, maxSize]);
        maxLength = spans[0].length;
        longestSpan = 0;
        for(var i = 1; i < spans.length; i++)
          if(spans[i].length > maxLength){
            maxLength = spans[i].length;
            longestSpan = i;
          }
      }
    }     
  }

 // fontSize = d3.min([height / spans.length, width / (maxLength * fontRatio)]);

  return {spans: spans, fontSize: fontSize};
}

function fillTextBlock(g, width, height, text, minSize, maxSize, fontRatio){
  var fit = wrapText(text, width, height, minSize, maxSize, fontRatio),
    spans = g.selectAll("text").data(d3.range(fit.spans.length));
    spans.exit().remove();
    spans.enter().append("text")
      .merge(spans)
        .attr("class", "plainText")
        .attr("text-anchor", "left")
        .attr("font-size", fit.fontSize)
        .attr("y", function(d) {return (d + 1) * fit.fontSize;})
        .text(function(d) {return fit.spans[d]});
}

function get_symbolSize(type, r) {
  var sizeCoef = {
    "Circle": 30,
    "Cross": 35,
    "Diamond": 46,
    "Square": 36,
    "Star": 47,
    "Triangle": 44,
    "Wye": 37
  };

  return Math.pow(r * 28.2 / sizeCoef[type], 2) * 3.14;
}

function escapeRegExp(str) {
  return str.replace(/[\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function call_pacer( interval ) {

   /*
   This "call pacer" serves to avoid jerky appearance when a redraw
   function is triggered to often because events fire to rapidly.
   
   Say, you have a handler, e.g., for a 'drag' event, which is supposed
   to call an 'update' function. Usually you would write
      some_object.on( "drag", update );
   If 'update' is complex, you may want to make sure that it is not called
   more often than, say, once in 30 ms. If the drag event fires more often,
   intermittant calls to 'update' should be skipped. For this, write.
     var pacer = call_pacer( 30 );
     some_object.on( "drag", function() { pacer.do( update ) } )
   Now, pacer.do will call 'update', but only if the last call was more than
   30 ms ago. It also ensures that after a lapse of more than 30 ms without
   event, the last lapsed call is then called, to draw the final state.
   */

   var obj = {
      interval: interval,
      prev_time: -Infinity,
      timer: null };

   obj.do = function() {
      var callback = arguments[0],
        args = [];
      for(var i = 1; i < arguments.length; i++)
        args.push(arguments[i]);
      if( obj.timer )
         obj.timer.stop();
      if( d3.now() - obj.prev_time >= interval ) {         
         callback.call(this, args);
         obj.prev_time = d3.now();
      } else {
         obj.timer = d3.timeout( callback, 1.5 * interval );
      }
   };

   return obj;
}

function check(type, property) {
  if(type == "number_nonneg") {
    return function(value) {
      if(typeof value === "function")
        return value;

      if(!isNaN$1(+value)) value = +value;
      if(typeof value === "number"){
        if(value >= 0)
          return value;
        throw "Error in 'typeCheck' for property '" + property + 
          "': negative values are not allowed."
      }
      throw "Error in 'typeCheck' for property '" + property + 
        "': numeric value is required."
    }
  }

  if(type == "array") {
    return function(value) {
      if(typeof value === "function")
        return value;

      if(Array.isArray(value)) return value;
    
      if(typeof value === "object") {
        var arr = [];
        for(el in value) 
          if(typeof value[el] == "string" || typeof value[el] == "number")
            arr.push(value[el]);
          else
            throw "Error in 'typeCheck' for property '" + property + 
                  "': the value is not an array."
        return arr;
      }
      if(typeof value === "number" || typeof value == "string") return [value];

      throw "Error in 'typeCheck' for property '" + property + 
             "': the value is not an array."
    }         
  }

  if(type == "array_fun") {
    return function(value) {
      if(typeof value === "object")
        return function(i) {return value[i]}

      return value;
    }
  }

  if(type = "matrix_fun") {
    return function(value) {
      if(typeof value === "function")
        return value;
      if(typeof value === "object"){
        var keys = Object.keys(value);
        if(typeof value[keys[0]] === "object")
          return function(i, j) {return value[i][j]}
        else
          return function(i) {return value[i]}
      }

      throw "Error in 'typeCheck' for property '" + property + 
        "': the value is not an array or an object."
    }
  }  
}

//interpretes NAs from R as NaNs and other cases that we don't want to use,
//when defining domains
function isNaN$1(value) {
  return (value == "NA" || value == "NaN" || value == "NAN" || value == "na" || value == "Infinity" || value == "Inf") 
}

function layerBase(id) {
	
	var layer = base()
    .add_property("nelements", undefined, check("number_nonneg", "width"))
    .add_property("elementIds", undefined, check("array", "elementIds"))
    .add_property("label", function(i) {return i;}, check("array_fun", "label"))
		.add_property("on_mouseover", function() {})
		.add_property("on_mouseout", function() {})
    .add_property("mode", "svg")
		.add_property("on_click", function() {})
		.add_property("layerDomainX", undefined, check("array", "layerDomainX"))
		.add_property("layerDomainY", undefined, check("array", "layerDomainY"))
		.add_property("contScaleX", function() {
      var domain = layer.layerDomainX();
      if(domain === undefined)
        return true
      else
        return domain.length == 2 && typeof domain[0] === "number" && typeof domain[1] === "number";
    })
		.add_property("contScaleY", function() {
      var domain = layer.layerDomainY();
      if(domain === undefined)
        return true
      else
        return domain.length == 2 && typeof domain[0] === "number" && typeof domain[1] === "number";
    })
    .add_property("colour", function(id) {
      return layer.colourScale(layer.get_colourValue(id));
    }, check("array_fun", "colour"))
    .add_property("addColourScaleToLegend", true)
    .add_property("palette", undefined, check("array", "palette"))
    .add_property("colourDomain", check("array", "colourDomain"))
    .add_property("colourValue", undefined, check("array_fun", "colourValue"))
    .add_property("colourLegendTitle", function(){return "colour_" + layer.id})
    .add_property("opacity", 1, check("array_fun", "opacity"))
		.add_property("dresser", function() {})
    .add_property("on_marked", function() {layer.chart.on_marked();})
    .add_property("informText", function(id) {
      return "<b>ID:</b> " + layer.get_label(id);
    });

  layer.propList = layer.propList.concat(["updateElementStyle", "updateElements", "updateElementPosition"]);
	layer.id = id;
  layer.marked = [];
  
  //if number of elements is set, define their IDs
  layer.wrapSetter("nelements", function(oldSetter){
    return function() {
      layer.get_elementIds = function(){
        return d3.range(oldSetter());
      };
      return oldSetter.apply(layer, arguments);
    }
  });
  //if element IDs are set, define their number
  layer.wrapSetter("elementIds", function(oldSetter){
    return function() {
      layer.get_nelements = function(){
        return oldSetter().length;
      };
      return oldSetter.apply(layer, arguments);
    }
  });

  layer.wrapSetter("colour", function(colour) {
    return function(){
      layer.addColourScaleToLegend(false);
      return colour.apply(layer, arguments);
    }
  });

  layer.colourDomain(function() {
    var ids = layer.elementIds();
    if(ids.length == 0)
      return;
    //if(layer.get_colourValue(ids[0]) !== undefined){
      var range = [];
      for(var i = 0 ; i < ids.length; i++)
        //colour range can contain only unique values
        if(range.indexOf(layer.get_colourValue(ids[i])) == -1)
          range.push(layer.get_colourValue(ids[i]));

      var undi = range.indexOf(undefined);
      if(undi > -1)
        range.splice(undi, 1);

      return range;
    //}
  });

  layer.colourScale = function(){
    return "black";
  };

  layer.resetColourScale = function() {
    var range = layer.colourDomain();
    if(range === undefined || range.length == 0)
      return;

    if(layer.chart.globalColourScale()) {
      range = layer.chart.globalColourDomain(layer.id, range);
      var l;
      for(var layerId in layer.chart.layers){
        l = layer.chart.get_layer(layerId);
        if(layerId != layer.id && !l.globalScaleUpdate){
          l.globalScaleUpdate = true;
          l.updateElementStyle();
        }
      }
    }

    //first of all, let's check if the colour scale supposed to be
    //categorical or continuous
    var allNum = true;
    for(var i = 0; i < range.length; i++)
      allNum = allNum && typeof range[i] === "number" && !lc.isNaN(range[i]);
    if(allNum)
      range.sort(function(a, b) {return a - b});
    var palette = layer.palette();    
    
    if(allNum){
      range = range.filter(function(el) {return el != "Infinity"});
      //the scale is continuous
      //Now look at the palette
      if(palette == undefined)
        if(d3.interpolateSpectral)
          palette = d3.interpolateSpectral;
        else
          palette = ["red", "yellow", "green", "blue"];
      //if palette is an array of colors, make a linear colour scale using all
      //values of the palette as intermideate points
      if(palette.splice){
        if(palette.length != range.length)
          range = [d3.min(range), d3.max(range)];
        if(palette.length == 1)
          palette.push(palette[0]);
        if(palette.length > range.length){
          var newRange = [];
          for(var i = 0; i < palette.length; i++)
            newRange.push(range[0] + i*(range[1] - range[0]) / (palette.length - 1));
          range = newRange; 
        }
        //now palette and range have exactly the same number of elements
        layer.colourValueScale = d3.scaleLinear()
          .domain(range)
          .range(palette);
        layer.colourScale = function(val) {
          return layer.colourValueScale(val);
        };
      } else {
        //palette is a d3.scale or d3.interpolator
        range = [d3.min(range), d3.max(range)];
        //if palette has a domain - use it, otherwise set a domain to
        //[0, 1] (used in d3. interpolators)
        var pDomain = [0, 1];
        if(palette.domain)
          pDomain = palette.domain();

        layer.colourValueScale = d3.scaleLinear()
          .domain(range)
          .range(pDomain);
        layer.colourScale = function(val) {
          return palette(layer.colourValueScale(val));
        };
      }
    } else {
      //the colour scale is categorical
      //range = range.sort()
      if(palette === undefined)
        palette = d3.schemeCategory10;
      if(palette.length){
        //just make sure that palette has enough elements to provide
        //colour to each object type
        var paletteLength = palette.length;
        for(var i = 0; i < range.length - paletteLength; i++)
          palette.push(palette[i % paletteLength]);

        layer.colourValueScale = d3.scaleOrdinal()
          .domain(range)
          .range(palette)
          .unknown("black");      
        layer.colourScale = function(val) {
          return layer.colourValueScale(val);
        };
      } else {
        var pDomain = [0, 1];
        if(palette.domain)
          pDomain = palette.domain();

        layer.colourValueScale = d3.scalePoint()
          .domain(range)
          .range(pDomain);        
        layer.colourScale = function(val) {
          return palette(layer.colourValueScale(val));
        };
      } 
    }

    layer.colourScale.domain = layer.colourValueScale.domain;
    
    if(layer.chart.showLegend() && layer.addColourScaleToLegend()){
      layer.addLegendBlock(layer.colourScale, "colour", layer.id + "_colour");
      var tObj = {};
      tObj[layer.id + "_colour"] = layer.colourLegendTitle();
      layer.chart.legend.set_title(tObj);
    }
  };

  layer.legendBlocks = [];

  layer.addLegendBlock = function(scale, type, id){
    layer.chart.legend.add_block(scale, type, id, layer);
    layer.legendBlocks.push(id);

    return layer; 
  };

	layer.update = function() {
    
    layer.updateStarted = true;
    layer.updateElements();
    layer.updateElementStyle();
    layer.updateElementPosition();
    layer.updateStarted = false;

    return layer;
  };

  var get_mode = function() {
    if(layer.mode() == "default")
      return layer.nelements() > 2500 ? "canvas" : "svg";
    return layer.mode();
  };

	layer.put_static_content = function() {
    layer.g = layer.chart.svg.selectAll(".plotArea").append("g")
      .attr("class", "chart_g")
      .attr("id", layer.id);

    layer.canvas = layer.chart.container.append("canvas")
      .style("position", "absolute")
      .style("z-index", -5)
      .attr("id", layer.id);

    (get_mode() == "svg") ? layer.g.classed("active", true) : 
                            layer.canvas.classed("active", true);  

    //layer.chart.svg.select(".clickPanel").raise();
	};
  
  layer.updateElements = function() {
  };
  layer.updateElementStyle = function() {
    layer.resetColourScale();
  	layer.get_dresser(layer.g.selectAll(".data_element"));

    if(layer.get_marked().length != 0)
      layer.colourMarked();

  	return layer;
  };

  layer.updateElementPosition = function() {};
  layer.findElements = function() {return [];}; //return empty selection	
	layer.get_position = function(id) {return undefined;};

  //default hovering behaviour
  layer.on_mouseover(function(d){
    var rect = layer.chart.container.node().getBoundingClientRect(),
      pos = [d3.max([d3.min([d3.event.clientX - rect.left, layer.chart.plotWidth()]), 0]), 
            d3.max([d3.min([d3.event.clientY - rect.top, layer.chart.plotHeight()]), 0])]; 

    //change colour and class
    if(!this || !this.prev_time)
      d3.select(this)
        .attr("fill", function(d) {
          return d3.rgb(layer.get_colour(d)).darker(0.5);
        })
        .classed("hover", true);
    //show label
    layer.chart.container.selectAll(".inform").data([d])
        .style("left", (pos[0] + 10) + "px")
        .style("top", (pos[1] + 10) + "px")
        .select(".value")
          .html(layer.get_informText(d));  
    layer.chart.container.selectAll(".inform")
      .classed("hidden", false);
  });
  layer.on_mouseout(function(d){
    if(!this.propList){
      var mark = layer.get_marked().length > 0;

      d3.select(this)
        .attr("fill", function(d) {
          return mark ^ d3.select(this).classed("marked") ?
                  "#aaa": layer.get_colour(d);
        })
        .classed("hover", false);
    }
    layer.chart.container.selectAll(".inform")
      .classed("hidden", true);
  });

  layer.get_marked = function() {
    if(get_mode() == "svg") 
      return layer.g.selectAll(".data_element")
        .filter(function() {return d3.select(this).classed("marked")})
        .data()
    else
      return layer.marked;
  };

  layer.checkMode = function(){
    if((get_mode() == "svg") && (layer.canvas.classed("active"))) {
      layer.canvas.classed("active", false);
      layer.g.classed("active", true);
      layer.canvas.node().getContext("2d")
        .clearRect(0, 0, layer.chart.plotWidth(), layer.chart.plotHeight());

      if(layer.updateStarted)
        return true;
      else{     
        layer.update();
        //layer.mark(layer.marked.map(function(e) {return "p" + e.join("_-sep-_")}));
        //layer.marked = [];
        return false;
      }
    }
    if((get_mode() == "canvas") && layer.g.classed("active")){
      layer.canvas.classed("active", true);
      //layer.marked = layer.g.selectAll(".marked").data();
      layer.g.classed("active", false);
      while (layer.g.node().firstChild) 
        layer.g.node().removeChild(layer.g.node().firstChild);
    }
    return true;
  };

  layer.mark = function(marked) {
    if(get_mode() == "svg") {
      if(marked == "__clear__"){
        layer.g.selectAll(".data_element.marked")
          .classed("marked", false);
        layer.g.selectAll(".data_element")
          .attr("opacity", 1);
        layer.chart.on_marked();
        layer.colourMarked();

        return layer.chart;
      }
    
      //marked can be either an array of IDs or a selection
      if(!marked.empty){
        var obj = {};
        obj[layer.id] = marked;
        marked = layer.chart.get_elements(obj);
      }
    
      if(marked.empty())
        return layer.chart;

      if(marked.size() == 1)
        marked.classed("marked", !marked.classed("marked"));
      else
        marked.classed("marked", true);

      layer.colourMarked();
    } else {
      if(marked == "__clear__")
        layer.marked = [];
      else {
        var ids = layer.marked.map(function(e) {return Array.isArray(e) ? e.join("_") : e}),
          ind;

        for(var i = 0; i < marked.length; i++){
          if(marked[i].join)
            ind = ids.indexOf(marked[i].join("_"));
          else
            ind = ids.indexOf(marked[i]);

          if(ind == -1)
            layer.marked.push(marked[i]);
          else {
            if(marked.length == 1)
              layer.marked.splice(ind, 1);
          }
        }
      }
      layer.updateCanvas();      
    }
    layer.on_marked();
  };

  layer.colourMarked = function() {
    if(get_mode() == "svg") {
      var marked = {};
      marked[layer.id] = layer.get_marked();
      marked = layer.chart.get_elements(marked);
    
      if(marked.empty())
        layer.g.selectAll(".data_element")
          .attr("fill", function(d) {return layer.get_colour(d)});
      else {
        layer.g.selectAll(".data_element")
          .attr("fill", function(d) {
            return d3.select(this).classed("marked") ? layer.get_colour(d) : "#aaa";
          });
      }

    }
  };

	return layer;
}

function panel(chart) {
	var panel = base()
		.add_property("x", function(){
			return chart.width() - panel.buttonSize() - 5;
		})
		.add_property("y", function(){
			return chart.margins().top * 0.05;
		})
		.add_property("orientation", "horizontal")
		.add_property("height", function(){
			if(panel.orientation() == "vertical")
				return Math.floor(panel.y() / panel.buttonSize()) * 
					panel.buttonSize();
		})
		.add_property("width", function() {
			if(panel.orientation() == "horizontal")
				return Math.floor(panel.x() / panel.buttonSize()) * 
					panel.buttonSize();
		})
		.add_property("buttonSize", 30);

	panel.chart = chart;
	var layout = {},
		buttons = [];

	panel.wrapSetter("orientation", function(orientation) {
		return function() {
			if(["vertical", "horizontal"].indexOf(orientation()) == -1)
				throw "Error in 'panel.orientation': value " + orientation() +
					" is not allowed for this property. Possible values are 'horizontal' or" +
					" 'vertical'."
			return orientation.apply(panel, arguments);
		}
	});

	panel.put_static_content = function(){
		panel.g = panel.chart.svg.append("g")
			.attr("class", "panel_g");

		initDefs();
		
		panel.g.append("use")
			.attr("xlink:href", "#toggleOff")
			.attr("id", "toggle")
			.attr("opacity", 0.7)
			.attr("title", "Click to show instrument panel")
			.on("mouseover", function() {
				d3.select(this)
					.attr("opacity", 1);
			})
			.on("mouseout", function() {
				d3.select(this)
					.attr("opacity", 0.7);
			})
			.on("click", panel.show)
			.append("title")
				.text("Click to show instrument panel");

		panel.g.append("g")
			.attr("id", "buttonPanel")
			.attr("class", "hidden");		
	};
	
	panel.updateSize = function() {

		placeButtons();
		if(panel.orientation() == "vertical"){
			panel.g.attr("transform", "translate(" + panel.x() + 
																", " + panel.y() + ")");
			panel.g.select("#toggle")
				.attr("transform", "translate(0, 0)");
			panel.g.select("#buttonPanel")
				.attr("transform", "translate(0, " + panel.buttonSize() + ")");
		} else {
			panel.g
				.attr("transform", "translate(" + 
														(panel.x() - layout.width) + 
																", " + panel.y() + ")");
			panel.g.select("#toggle")
				.attr("transform", "translate(" + layout.width + ", 0)");
			panel.g.select("#buttonPanel")
				.attr("transform", "translate(0, 0)");			
		}

	};

	function placeButtons() {
		if(panel.orientation()  == "horizontal"){
				optimizeSize(buttons.length, panel.width(), panel.height());
				panel.g.selectAll(".button")
					.attr("transform", function(d, i){
						return "translate(" + (i % layout.rowLength * panel.buttonSize()) + ", " +
							(Math.floor(i / layout.rowLength) * panel.buttonSize()) + ") scale(" + 
							((panel.buttonSize() - 10) / bs) + ")";
					});
		} else {
				optimizeSize(buttons.length, panel.height(), panel.width());
				panel.g.selectAll(".button")
					.attr("transform", function(d, i){
						return "translate(" + (Math.floor(i / layout.rowLength) * panel.buttonSize()) + ", " 
							+ ((i % layout.rowLength + 1) * panel.buttonSize()) + ") scale(" + 
							((panel.buttonSize() - 10) / bs) + ")";
					});
		}
	}
	function optimizeSize(n, width, height) {
		var rows, size;
		if(height){
			size = d3.min([width, height]);
			rows = 1;
			while(Math.floor(width / size) * rows < n){
				rows++;
				size = d3.min([height / rows, size]);
			}
			panel.buttonSize(size);
		} else {
			size = panel.buttonSize();
			rows = Math.ceil(width / size);
		}
		layout = {width: panel.width(),
							height: panel.height(),
							rowLength: d3.min([Math.floor(width / size), buttons.length])};
		if(panel.orientation() == "horizontal"){
			layout.width  = size * layout.rowLength;
			//panel.height(size * rows)
		} else {
			layout.height = size * layout.rowLength;
			//panel.width(size * rows);
		}
	}


	panel.add_button = function(name, icon, fun, hint){
		//if hint is defined, modify the provided f
		var hintFired = false;
		var wrapped = function(chart, button){
			if(!hintFired){
				showHint(hint); //hints are showed just once if defined
				hintFired = true;
			}
			fun(chart, button);
		};

		buttons.push({
			name: name,
			icon: icon,
			fun: wrapped
		});

		var buttonsSVG = panel.g.select("#buttonPanel")
			.selectAll(".button").data(buttons, function(d) {return d.name;});
		buttonsSVG.enter().append("use")
			.attr("opacity", 0.6)
			.attr("class", "button")
			.attr("id", function(d) {return "b_" + d.icon.substr(1)})
			.attr("xlink:href", function(d) {return d.icon})
			.on("click", function(d) {d.fun(panel.chart, d3.select(this));})
			.on("mouseover", function() {
				d3.select(this)
					.attr("opacity", 1);
			})
			.on("mouseout", function() {
				d3.select(this)
					.attr("opacity", 0.6);
			})
			.append("title")
				.text(function(d) {return d.name});

		return panel;
	};

	function showHint(hint) {
		if(hint){
			chart.container.append("div")
				.attr("class", "hint")
				.style("left", (panel.chart.width() - 105) + "px")
				.style("top", (panel.y() + panel.g.node().getBBox().height) + "px")
				.text(hint);
		}
	}

	panel.show = function(){
		panel.g.select("#toggle")
			.attr("opacity", 1)
			.on("click", panel.hide)
			.on("mouseout", function() {})
			.select("title")
				.text("Click to hide instrument panel");
		if(panel.orientation() == "horizontal")
			panel.g.select("#toggle")
				.attr("xlink:href", "#toggleOnHor");
		else
			panel.g.select("#toggle")
				.attr("xlink:href", "#toggleOnVer");

		panel.g.select("#buttonPanel")
			.classed("hidden", false);

	};

	panel.hide = function(){
		panel.g.select("#toggle")
			.attr("xlink:href", "#toggleOff")
			.attr("opacity", 0.7)
			.on("click", panel.show)
			.on("mouseout", function() {
				d3.select(this)
					.attr("opacity", 0.7);
			})
			.select("title")
				.text("Click to show instrument panel");
		panel.g.select("#buttonPanel")
			.classed("hidden", true);

	};

	var bs;

	function initDefs() {
		var defs = panel.g.append("def");
		bs = panel.buttonSize() - 10;
		
		var d = defs.append("g")
			.attr("id", "toggleOff");
		d.append("rect")
			.attr("stroke-width", 2)
			.attr("width", bs)
			.attr("height", bs)
			.attr("fill", "#aaa")
			.attr("stroke", "#444");
		d.append("path")
			.attr("d", "M " + bs/2  + " " + Math.floor(bs/3) + 
									" L " + Math.ceil(bs * 2 / 3) + " " + Math.ceil(bs * 2 / 3) + 
									" H " + Math.floor(bs/3) + 
									" L " + bs/2 + " " + Math.floor(bs/3))
			.attr("fill", "#444")
			.attr("stroke-width", 0);			

		d = defs.append("g")
			.attr("id", "toggleOnHor");
		d.append("rect")
			.attr("stroke-width", 2)
			.attr("width", bs)
			.attr("height", bs)
			.attr("fill", "#aaa")
			.attr("stroke", "#444");
		d.append("path")
			.attr("d", "M " + Math.floor(bs/3) + " " + bs/2 + 
									" L " + Math.ceil(bs * 2 / 3) + " " + Math.floor(bs/3) + 
									" V " + Math.floor(bs * 2 / 3) + 
									" L " + Math.floor(bs/3) + " " + bs/2)
			.attr("fill", "#444")
			.attr("stroke-width", 0);			

		d = defs.append("g")
			.attr("id", "toggleOnVer");
		d.append("rect")
			.attr("stroke-width", 2)
			.attr("width", bs)
			.attr("height", bs)
			.attr("fill", "#aaa")
			.attr("stroke", "#444");
		d.append("path")
			.attr("d", "M " + bs/2 + " " + Math.ceil(bs * 2 / 3) + 
									" L " + Math.floor(bs/3) + " " + Math.floor(bs/3) + 
									" H " + Math.floor(bs * 2 / 3) + 
									" L " + bs/2 + " " + Math.ceil(bs * 2 / 3))
			.attr("fill", "#444")
			.attr("stroke-width", 0);

		d = defs.append("g")
			.attr("id", "save");
		d.append("rect")
			.attr("stroke-width", 0)
			.attr("width", bs)
			.attr("height", bs)
			.attr("fill", "#444")
			.attr("rx", bs/10)
			.attr("ry", bs/10);
		d.append("path")
			.attr("d", "M " + Math.floor(4 * bs / 5) + " 0" + 
									" H " + bs + 
									" V " + Math.ceil(bs/5) + 
									" L " + Math.floor(4 * bs / 5) + " 0")
			.attr("fill", "#fff")
			.attr("stroke-width", 0);
		d.append("rect")
			.attr("x", Math.floor(bs/3))
			.attr("height", Math.floor(bs/3))
			.attr("width", Math.ceil(bs * 2 / 5))
			.attr("fill", "#fff")
			.attr("stroke-width", 0);
		d.append("rect")
			.attr("x", Math.floor(44 * bs / 75))
			.attr("width", Math.ceil(2 * bs / 25))
			.attr("height", Math.ceil(bs/4))
			.attr("fill", "#444")
			.attr("stroke-width", 0);
		d.append("rect")
			.attr("x", Math.floor(bs/4))
			.attr("width", Math.ceil(5 * bs / 12))
			.attr("y", bs/2)
			.attr("height", bs/2)
			.attr("rx", bs/10)
			.attr("ry", bs/10)
			.attr("fill", "#fff")
			.attr("stroke-width", 0);

		d = defs.append("g")
			.attr("id", "svg");
		d.append("text")
			.attr("font-size", bs * 1.5)
			.attr("textLength", bs)
			.attr("lengthAdjust", "spacingAndGlyphs")
			.attr("fill", "#444")
			.attr("y", bs)
			.attr("font-weight", 900)
			.attr("font-family", "Verdana")
			.text("SVG");
		
		d = defs.append("g")
			.attr("id", "selection");
		d.append("rect")
			.attr("fill-opacity", 0)
			.attr("width", Math.floor(bs * 2 / 3))
			.attr("height", Math.floor(bs * 2 / 3))
			.attr("x", Math.ceil(bs/3))
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", 2);
		d.append("path")
			.attr("fill", "#444")
			.attr("stroke-width", 0)
			.attr("stroke", "#444")
			.attr("d", "M " + Math.ceil(bs/3) + " " + Math.floor(bs * 2 / 3) + 
								" L 0 " + Math.ceil(3 * bs / 4) + 
								" l " + bs/12 + " " + bs/12 + 
								" L 0 " + (9 * bs / 10) +
								" L " + bs/10 + " " + bs +
								" L " + (11 * bs / 60) + " " + (11 * bs / 12) + 
								" L " + Math.floor(bs/4) + " " + bs + 
								" L " + Math.ceil(bs/3) + " " + Math.floor(bs * 2 / 3));
		d.append("circle")
			.attr("cx", Math.floor(bs/5))
			.attr("cy", Math.floor(bs/5))
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", Math.floor(4 * bs / 5))
			.attr("cy", Math.floor(4 * bs / 5))
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", Math.floor(2 * bs / 3))
			.attr("cy", Math.floor(bs / 3))
			.attr("r", 3)
			.attr("fill", "#111");

		d = defs.append("g")
			.attr("id", "zoomIn");
		d.append("path")
			.attr("fill", "#444")
			.attr("d", "M " + (2 * bs / 5) + " 0" + 
								" h " + bs/5 + 
								" v " + (2 * bs / 5) + 
								" h " + (2 * bs / 5) +
								" v " + bs/5 +
								" h -" + (2 * bs / 5) +
								" v " + (2 * bs / 5) +
								" h -" + bs/5 + 
								" v -" + (2 * bs / 5) +
								" h -" + (2 * bs / 5) +
								" v -" + bs/5 + 
								" h " + (2 * bs / 5) +
								" v -"+ (2 * bs / 5));

		d = defs.append("g")
			.attr("id", "zoomOut");
		d.append("rect")
			.attr("y", 3 * bs / 8)
			.attr("height", bs/4)
			.attr("width", bs)
			.attr("fill", "#444");

		d = defs.append("g")
			.attr("id", "home");
		d.append("rect")
			.attr("x", bs/5)
			.attr("y", 2 * bs / 5)
			.attr("width", 3 * bs / 5)
			.attr("height", 3 * bs / 5)
			.attr("fill", "#444");
		d.append("rect")
			.attr("x", bs * 2 / 5)
			.attr("y", bs * 3 / 5)
			.attr("width", bs/5)
			.attr("height", bs/5)
			.attr("fill", "#fff");
		d.append("path")
			.attr("fill", "#444")
			.attr("d", "M 0 " + (2 * bs / 5) + 
								" L " + bs/2 + " 0" +
								" L " + bs + " " + (2 * bs / 5));
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M 0 " + (2 * bs / 5) +
								" L " + bs + " " + (2 * bs / 5));

		d = defs.append("g")
			.attr("id", "pan");
		d.append("path")
			.attr("fill", "#444")
			.attr("d", "M 0 " + bs/2 + 
								" l " + bs/5 + " -" + bs/5 + 
								" v " + bs/10 + 
								" h " + bs/5 + 
								" v -" + bs/5 +
								" h -" + bs/10 +
								" L " + bs/2 + " 0" + 
								" l " + bs/5 + " " + bs/5 +
								" h -" + bs/10 +
								" v " + bs/5 + 
								" h " + bs/5 +
								" v -" + bs/10 +
								" L " + bs + " " + bs/2 +
								" l -" + bs/5 + " " + bs/5 +
								" v -" + bs/10 + 
								" h -" + bs/5 +
								" v " + bs/5 +
								" h " + bs/10 +
								" L " + bs/2 + " " + bs +
								" l -" + bs/5 + " -" + bs/5 +
								" h " + bs/10 + 
								" v -" + bs/5 +
								" h -" + bs/5 +
								" v " + bs/10 + 
								" L 0 " + bs/2);
		d = defs.append("g")
			.attr("id", "fitSelected");
		d.append("rect")
			.attr("x", bs/5)
			.attr("y", bs/5)
			.attr("width", 3 * bs / 5)
			.attr("height", 3 * bs / 5)
			.attr("fill", "#fff")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", 2);
		d.append("circle")
			.attr("cx", bs/5 - 3)
			.attr("cy", bs/2)
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", 3 * bs / 5)
			.attr("cy", bs/5 -3)
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", 4 * bs / 5 + 3)
			.attr("cy", 2 * bs / 5)
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", 2 * bs / 5)
			.attr("cy", 4 * bs / 5 + 3)
			.attr("r", 2)
			.attr("fill", "#444");
		d.append("circle")
			.attr("cx", 4 * bs / 5 - 3)
			.attr("cy", bs / 5 + 3)
			.attr("r", 3)
			.attr("fill", "#111");
		d.append("circle")
			.attr("cx", bs / 5 + 3)
			.attr("cy", 4 * bs / 5 - 3)
			.attr("r", 3)
			.attr("fill", "#111");

		d = defs.append("g")
			.attr("id", "clusterRows");
		d.append("rect")
			.attr("x", bs * 2 / 5)
			.attr("width", bs * 3 / 5)
			.attr("height", bs)
			.attr("fill", "#444");
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("y", bs/5)
			.attr("height", bs/2)
			.attr("width", bs * 2 / 5);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("y", bs/10)
			.attr("x", bs/5)
			.attr("height", bs/5)
			.attr("width", bs/5);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("x", bs/10)
			.attr("y", bs/2)
			.attr("height", bs * 3 / 10)
			.attr("width", bs * 3 / 10);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("x", bs/5)
			.attr("y", bs * 7 / 10)
			.attr("height", bs/5)
			.attr("width", bs/5);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 2 / 5 + " " + bs/5 + 
								" L " + bs + " " + bs/5);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 2 / 5 + " " + bs * 2 / 5 + 
								" L " + bs + " " + bs * 2 / 5);			
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 2 / 5 + " " + bs * 3 / 5 + 
								" L " + bs + " " + bs * 3 / 5);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 2 / 5 + " " + bs * 4 / 5 + 
								" L " + bs + " " + bs * 4 / 5);

		d = defs.append("g")
			.attr("id", "clusterCols");
		d.append("rect")
			.attr("y", bs * 2 / 5)
			.attr("height", bs * 3 / 5)
			.attr("width", bs)
			.attr("fill", "#444");
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("x", bs/5)
			.attr("width", bs/2)
			.attr("height", bs * 2 / 5);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("x", bs/10)
			.attr("y", bs/5)
			.attr("width", bs/5)
			.attr("height", bs/5);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("y", bs/10)
			.attr("x", bs/2)
			.attr("width", bs * 3 / 10)
			.attr("height", bs * 3 / 10);
		d.append("rect")
			.attr("stroke", "#444")
			.attr("stroke-width", 1)
			.attr("fill", "#fff")
			.attr("y", bs/5)
			.attr("x", bs * 7 / 10)
			.attr("width", bs/5)
			.attr("height", bs/5);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs/5 + " " + bs * 2 / 5 + 
								" L " + bs/5 + " " + bs);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 2 / 5 + " " + bs * 2 / 5 + 
								" L " + bs * 2 / 5 + " " + bs);			
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 3 / 5 + " " + bs * 2 / 5 + 
								" L " + bs * 3 / 5 + " " + bs);
		d.append("path")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1)
			.attr("d", "M " + bs * 4 / 5 + " " + bs * 2 / 5 + 
								" L " + bs * 4 / 5 + " " + bs);

		d = defs.append("g")
			.attr("id", "restoreOrder");
		d.append("text")
			.attr("font-size", bs * 1.5)
			.attr("textLength", bs)
			.attr("lengthAdjust", "spacingAndGlyphs")
			.attr("fill", "#444")
			.attr("y", bs)
			.attr("font-weight", 900)
			.attr("font-family", "Verdana")
			.text("123");	

		defs.selectAll("rect")
			.attr("transform", "translate(5, 5)");
		defs.selectAll("path")
			.attr("transform", "translate(5, 5)");
		defs.selectAll("text")
			.attr("transform", "translate(5, 5)");
		defs.selectAll("circle")
			.attr("transform", "translate(5, 5)");
		defs.selectAll("g").append("rect")
			.attr("fill", "transparent")
			.attr("width", panel.buttonSize())
			.attr("height", panel.buttonSize())
			.lower();
	}

	return panel;
}

function legend(chart) {
	var legend = lc.base()
		.add_property("width", 200)
		.add_property("height", function() {return chart.height();})
		.add_property("sampleHeight", 20)
		.add_property("titles", {})
		.add_property("ncol")
		.add_property("container");

	var blocks = {};
	legend.chart = chart;

	legend.set_title = function(titles) {
		var curTitles = legend.titles();
		for(var i in titles) 
			curTitles[i] = titles[i];
		
		legend.titles(curTitles);

		return legend;
	};

	legend.get_nblocks = function() {
		return Object.keys(blocks).length;
	};

	legend.add_block = function(scale, type, id, layer){
		//scale can be an array or d3 scale. If scale is an array,
		//we need to turn it into a scale
		var block = {};
		if(typeof scale === "function")
			block.scale = scale;
		else
			block.scale = function() {return scale;};
		
		if(typeof layer !== "undefined")
			block.layer = layer;
		if(["colour", "size", "symbol", "dash"].indexOf(type) == -1)
			throw "Error in 'legend.add_block': " + type + " is not a suitable type of legend block. " +
				"Please, use one of these: 'colour', 'size', 'symbol', 'dash'";
		block.type = type;

		blocks[id] = block;
		
		if(legend.container())
			updateGrid();

		return legend.chart;
	};

	legend.updateScale = function(scale, id){
		if(typeof blocks[id] === "undefined")
			throw "Error in 'legend.updateScale': A block with ID " + id +
				" is not defined";
		blocks[id].scale = scale;
		legend.updateBlock(id);

		return legend.chart;
	};

	 var convertScale = function(id) {
		var scale, newScale;
		if(typeof blocks[id].scale === "function")
			scale = blocks[id].scale();
		if(typeof scale === "undefined" || 
				(typeof scale !== "function" && typeof scale.splice === "undefined"))
			scale = blocks[id].scale;
		
		if(typeof scale !== "function"){
			var scCont = false,
				rCont = false;
			if(scale.length == 1)
				throw "Error in 'legend.convertScale': range of the scale is not defined.";
			if(scale[0].length == 2 && typeof scale[0][0] === "number" && 
																typeof scale[0][1] === "number")
				scCont = true;
			if(blocks[id].type == "colour" && scale[0].length != scale[1].length)
				rCont = true;
			if(scale[1].length == 2 && typeof scale[0][0] === "number" && 
																typeof scale[0][1] === "number")
				rCont = true;
			if(scCont && rCont){
				newScale = d3.scaleLinear()
					.domain(scale[0])
					.range(scale[1]);
				scale.steps ? newScale.steps = scale.steps : newScale.steps = 9;
			}
			if(scCont && !rCont){
				newScale = d3.scaleQuantize()
					.domain(scale[0])
					.range(scale[1]);
				newScale.steps = scale[1].length;
			}
			if(!scCont && rCont){
				newScale = d3.scalePoint()
					.domain(scale[0])
					.range(scale[1]);
				newScale.steps = scale[0].length;
			}
			if(!scCont && !rCont){
				if(scale[0].length > scale[1].length)
					scale[0].splice(scale[1].length);
				if(scale[1].length > scale[0].length)
					scale[1].splice(scale[0].length);
				newScale = d3.scaleOrdinal()
					.domain(scale[0])
					.range(scale[1]);
				newScale.steps = scale[0].length;				
			}
			blocks[id].domain = scale[0];
			if(typeof newScale.domain === "undefined")
				newScale.domain = blocks[id].domain;
		} else {
			//scale is a function it is either a d3 scale or it has a domain property
			if(typeof scale !== "function")
				throw "Error in 'legend.convertScale': the type of scale argument is not suported. " +
					"Scale should be an array or a function."
			var domain;
			typeof scale.domain === "function" ? domain = scale.domain() : domain = scale.domain;
			if(typeof domain === "undefined")
				throw "Error in 'legend.convertScale': the domain of the scale is not defined.";
			//look for undefined values in the domain and remove them
			var i = 0;
			while(i < domain.length)
				if(domain[i] === undefined)
					domain.splice(i, 1);
				else
					i++;

			blocks[id].domain = domain;
			newScale = scale;
			if(scale.steps)
				newScale.steps = scale.steps;
			else {
				domain.length == 2 && typeof domain[0] === "number" ? newScale.steps = 9 : newScale.steps = domain.length;
			} 
		}
		return newScale;
	};

	legend.removeBlock = function(id) {
		if(typeof blocks[id] === "undefined")
			throw "Error in 'legend.remove': block with ID " + id +
			" doesn't exist";
		if(typeof blocks[id].layer !== "undefined")
			blocks[id].layer.legendBlocks.splice(
				blocks[id].layer.legendBlocks.indexOf(id), 1
			);
		delete blocks[id];
		legend.g.select("#" + id).remove();
		updateGrid();

		return legend.chart;
	};

	legend.renameBlock = function(oldId, newId) {
		blocks[newId] = blocks[oldId];
		delete blocks[oldId];
		if(typeof blocks[newId].layer !== "undefined")
			blocks[newId].layer.legendBlocks.splice(
				blocks[newId].layer.legendBlocks.indexOf(oldId), 1, newId
			);
		if(legend.g){
			legend.g.select("#" + oldId)
				.attr("id", newId);
			legend.updateBlock(newId);
		}

		return legend.chart;
	};
var updateGrid = function() {
		//define optimal layout for all the blocks
		//and create a table
		var bestWidth, bestHeight,
			n = Object.keys(blocks).length;

		if(typeof legend.ncol() === "undefined"){
			var minSum = 1 + n, j;
			bestHeight = 1; 
			for(var i = 2; i <= Math.ceil(Math.sqrt(n)); i++){
				j =  Math.ceil(n / i);
				if(i + j <= minSum){
					minSum = i + j;
					bestHeight = i;
				}
			}
			bestWidth = Math.ceil(n / bestHeight);
		} else {
			bestWidth = legend.ncol();
			bestHeight = Math.ceil(n / bestWidth);
		}
		legend.container().select(".legendTable").remove();
		legend.container().append("table")
			.attr("class", "legendTable")
			.selectAll("tr").data(d3.range(bestHeight))
				.enter().append("tr");
		legend.container().selectAll("tr").selectAll("td")
			.data(function(d) {
				return d3.range(bestWidth).map(function(e) {
					return [d, e];
				})
			})	
			.enter().append("td")
				.attr("id", function(d) {
					try{
						return Object.keys(blocks)[d[0] * bestWidth + d[1]]
										.replace(/[ .]/g, "_");
					} catch(exc) {return undefined;}
				});
		for(var i in blocks)
			legend.updateBlock(i);
	};


	legend.updateBlock = function(id){
		if(typeof blocks[id] === "undefined")
			throw "Error in 'legend.updateBlock': block with ID " + id +
				" is not defined";

		var scale = convertScale(id),
			tableCell = legend.container().select("#" + id.replace(/[ .]/g, "_")),
			cellWidth = legend.width() / legend.container().select("tr").selectAll("td").size(),
			steps = scale.steps,
			cellHeight = legend.sampleHeight() * steps;

		var blockSvg = tableCell.selectAll("svg");
		if(blockSvg.empty())
			blockSvg = tableCell.append("svg");
		blockSvg.attr("width", cellWidth)
			.attr("height", cellHeight);
	
		var title = blockSvg.select(".title");
		if(title.empty())
			title = blockSvg.append("g")
				.attr("class", "title");
		var titleWidth = d3.min([20, cellWidth * 0.2]);
		fillTextBlock(title, cellHeight, titleWidth, (legend.titles()[id] == "") ? "" : (legend.titles()[id] || id));
		title.attr("transform", "rotate(-90)translate(-" + cellHeight + ", 0)");

		var sampleValues;
		if(blocks[id].domain.length == steps)
			sampleValues = blocks[id].domain;
		else
			sampleValues = d3.range(steps).map(function(e) {
				return (blocks[id].domain[0] + e * 
								(blocks[id].domain[1] - blocks[id].domain[0]) / 
								(steps - 1));
			});
		var sampleData = [],n;
		for(var i = 0; i < sampleValues.length; i++){
			if(typeof sampleValues[i] === "number")
				if(Math.abs(sampleValues[i] >= 1 || sampleValues[i] == 0))
					sampleValues[i] = sampleValues[i].toFixed(2);
				else {
					n = 1 - Math.floor(Math.log(Math.abs(sampleValues[i]))/Math.log(10));
					if(n > 5)
						sampleValues[i] =  sampleValues[i].toExponential();
					else	
						sampleValues[i] =  sampleValues[i].toFixed(n);
				}	
					

			sampleData.push([sampleValues[i]]);
		}
		
		var samples = blockSvg.selectAll(".sample").data(sampleData);
		samples.exit().remove();
		samples.enter().append("g")
			.attr("class", "sample")
			.merge(samples)
				.attr("transform", function(d, i) {
					return "translate(" + (titleWidth + 1) + ", " + 
									(i * legend.sampleHeight()) + ")";
				});

		if(blocks[id].type == "colour"){
			var rect = blockSvg.selectAll(".sample").selectAll("rect").data(function(d){
				return d;
			});
			rect.enter().append("rect")
				.merge(rect)
					.attr("width", titleWidth)
					.attr("height", legend.sampleHeight())
					.attr("fill", function(d) {return scale(d)});
		}
		if(blocks[id].type == "symbol"){
			var size = d3.min([legend.sampleHeight() / 2, 
													titleWidth / 2]);
			var symbols = blockSvg.selectAll(".sample").selectAll("path").data(function(d){
				return d;
			});
			symbols.enter().append("path")
				.merge(symbols)
					.attr("d", function(d) {
						return d3.symbol()
							.type(d3["symbol" + scale(d)])
							.size(get_symbolSize(scale(d), size))();
					})
					.attr("transform", "translate(" + size + ", " + size + ")");
		}
		if(blocks[id].type == "dash"){
			var lines = blockSvg.selectAll(".sample").selectAll("line").data(function(d){
				return d;
			});
			lines.enter().append("line")
				.style("stroke", "black")
			 	.merge(lines)
			 		.attr("x1", 0)
			 		.attr("x2", titleWidth)
			 		.attr("y1", legend.sampleHeight() / 2)
			 		.attr("y2", legend.sampleHeight() / 2)
			 		.attr("stroke-dasharray", function(d) {return scale(d)});
		}

		var sampleText = blockSvg.selectAll(".sample").selectAll("g").data(function(d){
			return (typeof d[0] === "number") ? [d[0].toString()] : d;
		});
		sampleText.enter().append("g")
			.merge(sampleText)
				.attr("transform", "translate(" + (titleWidth + 5) + ", 0)");
		blockSvg.selectAll(".sample").selectAll("g").each(function(d) {
			fillTextBlock(d3.select(this), cellWidth - 2 * titleWidth - 5, 
											legend.sampleHeight(), d
										);
		});		
	};
	legend.update = function() {
		updateGrid();
	};

	return legend;
}

function chartBase() {
	//add and set new properties
	var chart = base()
		.add_property("width", 500, check("number_nonneg", "width"))
		.add_property("height", 500, check("number_nonneg", "height"))
		.add_property("margins", { top: 35, right: 10, bottom: 50, left: 50 }, 
			function(value) {
				if(typeof value === "function")
					return value;
				if(value.top === undefined)
					throw "Error in 'typeCheck' for property 'margins': top-margin is not defined";
				if(value.left === undefined)
					throw "Error in 'typeCheck' for property 'margins': left-margin is not defined";
				if(value.bottom === undefined)
					throw "Error in 'typeCheck' for property 'margins': bottom-margin is not defined";
				if(value.right === undefined)
					throw "Error in 'typeCheck' for property 'margins': right-margin is not defined";
				return value;
			})
		.add_property("title", "")
		.add_property("titleX", function() {return chart.width() / 2;}, check("number_nonneg", "titleX"))
		.add_property("titleY", function() {return d3.min([17, chart.margins().top * 0.9]);}, check("number_nonneg", "titleY"))
		.add_property("titleSize", function() {return d3.min([15, chart.margins().top * 0.8]);}, check("number_nonneg", "titleSize"))
		.add_property("transitionDuration", 1000, check("number_nonneg", "transitionDuration")) //may be set to zero
		.add_property("on_marked", function() {})
		.add_property("showPanel", true)
		.add_property("clickSingle", true)		
		.add_property("showLegend", true)
		.add_property("plotWidth", undefined, check("number_nonneg", "plotWidth"))
		.add_property("plotHeight", undefined, check("number_nonneg", "plotHeight")); 
	  
	chart.legend = legend(chart); 

	var plotHeight_default = function() {
			return chart.height() - (chart.margins().top + chart.margins().bottom);
		},
		plotWidth_default = function() {
			return chart.width() - (chart.margins().right + chart.margins().left);
		};

	chart.plotWidth(plotWidth_default)
		.plotHeight(plotHeight_default);

	//if width or height is changed by user, plotWidth or plotHeight respectively
	//should be changed as well
	chart.wrapSetter("width", function(width) {
		return function() {
			chart.get_plotWidth = plotWidth_default;
			return width.apply(chart, arguments);
		}
	});
	chart.wrapSetter("height", function(height) {
		return function() {
			chart.get_plotHeight = plotHeight_default;
			return height.apply(chart, arguments);
		}
	});
	//if plotWidth or plotHeight is changed by user, width or height respectively
	//should be changed as well
	chart.wrapSetter("plotWidth", function(plotWidth){
		return function() {
			chart.get_width = function() {
				return plotWidth() + chart.margins().left + chart.margins().right;
			};
			return plotWidth.apply(chart, arguments);
		}
	});
	chart.wrapSetter("plotHeight", function(plotHeight){
		return function() {
			chart.get_height = function() {
				return plotHeight() + chart.margins().top + chart.margins().bottom;
			};
			return plotHeight.apply(chart, arguments);
		}
	});

	//if this is true, select elements when they are clicked
	var selectMode = false;
	chart.selectMode = function(value) {
		if(value == undefined)
			return selectMode;

		value = (value == true);
		selectMode = value;
		return chart;
	};

	//setter and indicator for pan mode
	var pan = {mode: false, down: undefined};
	chart.pan = function(pr, value){
		if(value == undefined)
			return pan[pr];
		pan[pr] = value;
		return chart;
	}; 

	//allows to change only some of the margins
  chart.set_margins = function(margins){
  	if(typeof margins.top === "undefined")
  		margins.top = chart.margins().top;
  	if(typeof margins.bottom === "undefined")
  		margins.bottom = chart.margins().bottom;
  	if(typeof margins.left === "undefined")
  		margins.left = chart.margins().left;
  	if(typeof margins.right === "undefined")
  		margins.right = chart.margins().right;
  	
  	chart.margins(margins);
  	return chart;
  };

  function addPanel() {
		if(chart.panel == undefined){
			chart.panel = panel(chart);
			chart.panel.put_static_content();
		}

		chart.panel.add_button("Save plot as png", "#save", saveAsPng);
		chart.panel.add_button("Save plot as svg", "#svg", saveAsSvg);
		chart.panel.add_button("Select elements", "#selection", selection,
										 "You can also select elements by pressing 'Shift'");
		chart.panel.add_button("Togle pan mode", "#pan", panMode);
		chart.panel.add_button("Reset scales", "#home", function(chart){chart.resetDomain();},
											 "You can also use double click to reset scales");
		chart.panel.add_button("Fit selected", "#fitSelected", fitSelected);  	
  }

  //add all the static elements of the chart to a specified
  //container
  chart.put_static_content = function( element ) {
		//outer div that contains everything related to this chart
		chart.container = element.append("div")
			.style("position", "relative")
			.attr("class", "linked-charts");
		//prohibit standart dragging behaviour
		chart.container.node().ondragstart = function() { return false; };
		//container for all svg elements
		chart.svg =	chart.container
			.append("table")
				.attr("class", "mainTable")
				.append("tr")
					.append("td")
						.append("svg");

		//add a cell for the legend
		chart.legend.container(chart.container.selectAll("tr")
													.append("td").attr("id", "legend"));

		//information label
		chart.container.append("div")
			.attr("class", "inform hidden")
			.append("p")
				.attr("class", "value");
		//main title
		chart.svg.append("text")
			.attr("class", "title plainText")
			.attr("text-anchor", "middle");
		//here all the points (lines, cells etc.) will be placed
		chart.svg.append("svg")
			.attr("class", "plotArea");
		//add instrument panel if needed
		if(chart.showPanel()) addPanel();
	};

	//toggle selection for a provided list of elements
	chart.mark = function(marked) {
		//deselect everything
		if(marked == "__clear__"){
			chart.svg.selectAll(".data_element.marked")
				.classed("marked", false);
			chart.svg.selectAll(".data_element")
				.attr("opacity", 1);
			chart.on_marked();
			return chart;
		}
		
		//marked can be either an array of IDs or a selection
		if(!marked.empty)
			marked = chart.get_elements(marked);
		
		if(chart.svg.selectAll(".data_element.marked").empty())
			chart.svg.selectAll(".data_element")
				.attr("opacity", 0.5);
		marked.classed("switch", true);
		if(marked.size() < 2)
			marked.filter(function() {return d3.select(this).classed("marked");})
				.classed("switch", false)
				.classed("marked", false)
				.attr("opacity", 0.5);
		marked.filter(function() {return d3.select(this).classed("switch");})
			.classed("marked", true)
			.classed("switch", false)
			.attr("opacity", 1);
		if(chart.svg.selectAll(".data_element.marked").empty())
			chart.svg.selectAll(".data_element")
				.attr("opacity", 1);

		chart.on_marked();

		return chart;
	};

  chart.place = function( element ) {
    //if no element is provided add the chart simply to the body of the page
    if( element === undefined )
      element = "body";
    if( typeof( element ) == "string" ) {
      var node = element;
      element = d3.selectAll( node );
      if( element.size() == 0 )
        throw "Error in function 'place': DOM selection for string '" +
          node + "' did not find a node."
  	}
  	//when the chart is updated for the first time, turn off the transition
  	chart.transitionOff = true;
		chart.put_static_content( element );
    chart.update();
    chart.transitionOff = false;
    
    return chart;
  };
	
	//update parts
	chart.updateSize = function() {
		
		if(chart.transitionDuration() > 0 && !chart.transitionOff){
			var t = d3.transition("size")
				.duration(chart.transitionDuration());
			chart.svg.transition(t)
				.attr("width", chart.width())
				.attr("height", chart.height());
			chart.svg.selectAll(".title").transition(t)
				.attr("font-size", chart.titleSize())
				.attr("x", chart.titleX())
				.attr("y", chart.titleY());
			chart.svg.selectAll(".plotArea").transition(t)
				.attr("x", chart.margins().left)
				.attr("y", chart.margins().top)
				.attr("width", chart.plotWidth())
				.attr("height", chart.plotHeight());
		} else {
			chart.svg
				.attr("width", chart.width())
				.attr("height",	chart.height());
			chart.svg.selectAll(".title")
				.attr("font-size", chart.titleSize())
				.attr("x", chart.titleX())
				.attr("y", chart.titleY());
			chart.svg.selectAll(".plotArea")
				.attr("x", chart.margins().left)
				.attr("y", chart.margins().top)
				.attr("width", chart.plotWidth())
				.attr("height", chart.plotHeight());
		}
		
		if(chart.showPanel())
			chart.panel.updateSize();

		return chart;			
	};
	chart.updateTitle = function(){
		chart.svg.selectAll(".title")
			.text(chart.title());

		return chart;		
	};

	chart.get_elements = function(data){
		if(!data.splice)
			data = [data];
		data = data.map(function(e) {return escapeRegExp(e).replace(/[ .]/g, "_")});
		return chart.svg.selectAll("#p" + data.join(", #p"));
	};

	chart.update = function(){
		chart.updateSize();
		chart.updateTitle();

		if(chart.showLegend() && chart.legend.get_nblocks() > 0)
			chart.legend.update();

		return chart;
	};

  return chart;
}

function saveAsPng(chart) {
	function drawInlineSVG(svgElement, ctx, callback, legend$$1){
		var svgInnerHTML;
		if(legend$$1 !== undefined){
			var w, h = 0, lsvg, hlist;
			svgInnerHTML = "<g>" + svgElement.innerHTML + "</g>";
			legend$$1.container().selectAll("tr").each(function(d, i){
				w = 0;
				hlist = [];
				d3.select(this).selectAll("td").each(function(dtd, itd){
					lsvg = d3.select(this).selectAll("svg");
					svgInnerHTML += "<g transform='translate(" + (legend$$1.chart.width() + w) + ", "+ h + ")'>" +
	 												lsvg.node().innerHTML + "</g>";
					hlist.push(lsvg.attr("height"));
					w += +lsvg.attr("width");
				});
	  		h += +d3.max(hlist);
 			});
  		svgInnerHTML = "<svg xmlns='http://www.w3.org/2000/svg'>" + svgInnerHTML + "</svg>";
  	} else
  		svgInnerHTML = new XMLSerializer().serializeToString(svgElement);
  	
  	var img  = new Image();
  	img.onload = function(){
    	ctx.drawImage(this, 0,0);
    	if(chart.canvas && chart.canvas.classed("active"))
    		ctx.drawImage(chart.canvas.node(), chart.margins().left, chart.margins().top);
    	callback();
    };
  	img.src = 'data:image/svg+xml; charset=utf8, '+encodeURIComponent(svgInnerHTML);
 	}

	var canvas = document.createElement('canvas');
	if(chart.legend === undefined){
		canvas.height = chart.svg.attr('height');
		canvas.width = chart.svg.attr('width');
	} else {
		canvas.height = d3.max([chart.height(), chart.legend.height()]);
		canvas.width = chart.width() + chart.legend.width();					
	}

	var ctx = canvas.getContext("2d");
	var actCanv = chart.container
		.selectAll("canvas")
			.filter(function() {return d3.select(this).classed("active")})
				.nodes();
	for(var i = 0; i < actCanv.length; i++) 
		ctx.drawImage(actCanv[i], chart.margins().left, chart.margins().top);

	chart.svg.selectAll("text").attr("fill", "black");

 	var ch = chart.svg.node().cloneNode(true);
 	for(var i = 0; i < ch.childNodes.length; i++)
 		if(ch.childNodes[i].classList[0] == "panel_g")
 			ch.removeChild(ch.childNodes[i]);	

	drawInlineSVG(ch, canvas.getContext("2d"), 
		function(){
			var dataURL = canvas.toDataURL('image/png');
			var data = atob(dataURL.substring('data:image/png;base64,'.length)),
	     								asArray = new Uint8Array(data.length);

			for (var i = 0, len = data.length; i < len; ++i)
	 			asArray[i] = data.charCodeAt(i);

			var blob = new Blob([asArray.buffer], {type: 'image/png'});
			saveAs(blob, 'export_' + Date.now() + '.png');
		}, chart.legend);
}

function saveAsSvg(chart){
 	//chart.svg.selectAll(".panel_g")
 	//	.style("display", "none");
 	
 	var ch = chart.svg.node().cloneNode(true);
 	for(var i = 0; i < ch.childNodes.length; i++)
 		if(ch.childNodes[i].classList[0] == "panel_g")
 			ch.removeChild(ch.childNodes[i]);

	if(!chart.container
			.selectAll("canvas")
				.filter(function() {return d3.select(this).classed("active")})
					.empty()) {
		chart.container.append("div")
			.attr("class", "hint")
			.attr("id", "errMessage")
			.style("left", (chart.width()/3) + "px")
			.style("top", (chart.height()/3) + "px")
			.style("width", (chart.width()/3) + "px")
			.text("Chart in canvas mode cannot be saved as SVG.");
		setTimeout(function() {chart.container.select("#errMessage").remove();}, 2000);
		return;
	}

	
 	var html;
  if(chart.legend !== undefined){
  	var w, h = 0, lsvg, hlist;
  	html = "<g>" + ch.innerHTML + "</g>";
  	chart.legend.container().selectAll("tr").each(function(){
	  	w = 0;
	  	hlist = [];
	  	d3.select(this).selectAll("td").each(function(){
	  		lsvg = d3.select(this).selectAll("svg");
	  		html += "<g transform='translate(" + (chart.width() + w) + ", " + h + ")'>" +
	  						lsvg.node().innerHTML + "</g>";
	  		hlist.push(lsvg.attr("height"));
	  		w += +lsvg.attr("width");
	  	});
	  	h += +d3.max(hlist);
  	});
		html = "<svg xmlns='http://www.w3.org/2000/svg'>" + html + "</svg>";
	} else
		html = chart.svg
 	    .attr("xmlns", "http://www.w3.org/2000/svg")
   	  .node().parentNode.innerHTML;

  var blob = new Blob([html], {type: "image/svg+xml"});
	saveAs(blob, 'export_' + Date.now() + '.svg');

	//chart.svg.selectAll(".panel_g")
	//	.style("display", undefined);
}

function selection(chart, button){
	if(button.classed("clicked")){
		button
			.classed("clicked", false)
			.attr("opacity", 0.6)
			.on("mouseout", function() {
				d3.select(this).attr("opacity", 0.6);
			});
		chart.selectMode(false);
	} else {
		button
			.classed("clicked", true)
			.attr("opacity", 1)
			.on("mouseout", function() {});
		chart.selectMode(true);
		var panButton = chart.panel.g.selectAll("#b_pan");
		if(panButton.classed("clicked"))
			panButton.on("click").call(panButton.node(), panButton.datum());					
	}
}

function panMode(chart, button){
	if(button.classed("clicked")){
		button
			.classed("clicked", false)
			.attr("opacity", 0.6)
			.on("mouseout", function() {
				d3.select(this).attr("opacity", 0.6);
			});
		chart.pan("mode", false);
	} else {
		button
			.classed("clicked", true)
			.attr("opacity", 1)
			.on("mouseout", function() {});
		chart.pan("mode", true);
		var selectButton = chart.panel.g.selectAll("#b_selection");
		if(selectButton.classed("clicked"))
			selectButton.on("click").call(selectButton.node(), selectButton.datum());
	}
}

function fitSelected(chart){
	var marked = chart.get_marked();
	if(marked.length == 0)
		return;
	var pos = {x: [], y: []};
	marked.map(function(e) {
		var elementPos = chart.get_position(e); 
		pos.x.push(elementPos[0]);
		pos.y.push(elementPos[1]);
	});
	var x_range = d3.extent(pos.x),
		y_range = d3.extent(pos.y);
	chart.zoom([x_range[0], y_range[0]], [x_range[1], y_range[1]]);
}

function axesChart() {
	
	var chart = layerChart();
	
	chart.add_property("singleScaleX", true)//not active now
		.add_property("singleScaleY", true)//not active now
		.add_property("domainX", undefined, check("array", "domainX"))
		.add_property("domainY", undefined, check("array", "domainY"))
		.add_property("aspectRatio", undefined, check("number_nonneg", "aspectRatio"))
		.add_property("axisTitleX", "")
		.add_property("axisTitleY", "")
		.add_property("ticksX", undefined)
		.add_property("ticksRotateX", 0, function(value) {
			if(isNaN(value))
				throw "Error in 'typeCheck' for property 'ticksRotateX': " +
							"the value is not a number.";

			return value % 90;
		})
		.add_property("ticksRotateY", 0, function(value) {
			if(isNaN(value))
				throw "Error in 'typeCheck' for property 'ticksRotateY': " +
							"the value is not a number.";

			return value % 90;
		})
		.add_property("ticksY", undefined)
		.add_property("logScaleX", false)
		.add_property("logScaleY", false);

	chart.axes = {};
	
	//default getter for domain
	//tries to make domain fit data from all layers
	//for axis capital letters a supposed to be used
	var get_domain = function(axis) {
		return function() {
			var domain;
			//TODO: add possibility of adding several axises
			//(one for each plot.layer)
			if(chart["get_singleScale" + axis]()){
				//if all the layers use continuous scale, make the scale continuous
				//otherwise make it categorical
				var contScale = true;
				for(var k in chart.layers)
					contScale = contScale && chart.get_layer(k)["get_contScale" + axis]();

				if(contScale){//if resulting scale is continous, find minimun and maximum values
					for(var k in chart.layers)
						//some of the layers may not have domains at all (such as legends)
						if(typeof chart.get_layer(k)["get_layerDomain" + axis]() !== "undefined")
							if(typeof domain === "undefined") 
								domain = chart.get_layer(k)["get_layerDomain" + axis]();
							else {
								domain[0] = d3.min([domain[0], chart.get_layer(k)["get_layerDomain" + axis]()[0]]);
								domain[1] = d3.max([domain[1], chart.get_layer(k)["get_layerDomain" + axis]()[1]]);
							}
				} else { //if scale is categorical, find unique values from each layer
					for(var k in chart.layers)
						if(typeof chart.get_layer(k)["get_layerDomain" + axis]() !== "undefined")
							if(typeof domain === "undefined") 
								domain = chart.get_layer(k)["get_layerDomain" + axis]();
							else 
								domain = domain.concat(chart.get_layer(k)["get_layerDomain" + axis]()
									.filter(function(e){
										return domain.indexOf(e) < 0;
									}));
				}
			}
			if(domain === undefined) domain = [0, 1];
			if(contScale) 
				if(chart["logScale" + axis]()) {
					domain[1] = domain[1] * 2;
					domain[0] = domain[0] / 2;
				} else {
					domain[1] = domain[1] + 0.03 * (domain[1] - domain[0]);
					domain[0] = domain[0] - 0.03 * (domain[1] - domain[0]);
				} 
			
			return domain;
		}
	};

	chart.get_domainX = get_domain("X");
	chart.get_domainY = get_domain("Y");

	//redefine setters for axis domains
	chart.domainX = function(domain){
		//set default getter
		if(domain == "reset"){
			chart.domainX(chart.origDomainX);
			return chart;
		}
		//if user provided function, use this function
		if(typeof domain === "function")
			chart.get_domainX = domain;
		if(domain.splice)
			chart.get_domainX = function() {
				return domain;
			};
			
		return chart;
	};
	chart.domainY = function(domain){
		if(domain == "reset"){
			chart.domainY(chart.origDomainY);
			return chart;
		}
		if(typeof domain === "function")
			chart.get_domainY = domain;
		if(domain.splice)
			chart.get_domainY = function() {
				return domain;
			};
		
		return chart;
	};

	chart.get_position = function(id){
		return chart.get_layer(id[0]).get_position(id[1]);
	};

	chart.zoom = function(lu, rb){
		if(lu[0] == rb[0] || lu[1] == rb[1])
			return;
    if(chart.axes.scale_x.invert)
    	chart.domainX([chart.axes.scale_x.invert(lu[0]), 
      	             chart.axes.scale_x.invert(rb[0])]);
    else {
    	var newDomainX = [], domainX = chart.get_domainX(),
    		i = 0;
    	while(chart.axes.scale_x(domainX[i]) <= rb[0]){
				if(chart.axes.scale_x(domainX[i]) >= lu[0])
					newDomainX.push(domainX[i]);
				i++;    	
    	}
    	if(newDomainX.length > 0)
    		chart.domainX(newDomainX);
    }

    if(chart.axes.scale_y.invert)
	    chart.domainY([chart.axes.scale_y.invert(rb[1]),
                    chart.axes.scale_y.invert(lu[1])]);
    else {
    	var newDomainY = [], domainY = chart.get_domainY(),
    		i = 0;
    	while(chart.axes.scale_y(domainY[i]) <= rb[1]){
				if(chart.axes.scale_y(domainY[i]) >= lu[1])
					newDomainY.push(domainY[i]);
				i++;    	
    	}
    	if(newDomainY.length > 0)
    		chart.domainY(newDomainY);
    }

    chart.updateAxes();
  };
  chart.resetDomain = function(){
    chart.domainX("reset");
    chart.domainY("reset");
    chart.updateAxes();
  };

  var inherited_put_static_content = chart.put_static_content;
  chart.put_static_content = function( element ) {
    inherited_put_static_content( element );
		
		var g = chart.svg.append("g")
			.attr("class", "axes_g");

    chart.axes.x_g = g.append( "g" )
      .attr( "class", "x axis" );
    chart.axes.x_label = chart.axes.x_g.append( "text" )
      .attr( "class", "label" )
      .attr( "y", -6 )
      .style( "text-anchor", "end" );

    chart.axes.y_g = g.append( "g" )
      .attr( "class", "y axis" );
    chart.axes.y_label = chart.axes.y_g.append( "text" )
      .attr( "class", "label" )
      .attr( "transform", "rotate(-90)" )
      .attr( "y", 6 )
      .attr( "dy", ".71em" )
      .style( "text-anchor", "end" );

		chart.origDomainY = chart.get_domainY;
		chart.origDomainX = chart.get_domainX;

		if(chart.showPanel()) {
			chart.panel.add_button("Zoom in", "#zoomIn", function(chart){
				var xDomain = chart.axes.scale_x.domain(),
					yDomain = chart.axes.scale_y.domain();
				if(xDomain.length == 2 && typeof xDomain[0] == "number" && typeof xDomain[1])
					chart.domainX([(xDomain[0] * 4 + xDomain[1])/5, 
												(xDomain[0] + xDomain[1] * 4)/5]);
				else {
					var removeElements = Math.ceil(xDomain.length * 0.1);
					xDomain.splice(0, removeElements);
					xDomain.splice(xDomain.length - removeElements);
					if(xDomain.length > 0)
						chart.domainX(xDomain);
				}
				if(yDomain.length == 2 && typeof yDomain[0] == "number" && typeof yDomain[1])
					chart.domainY([(yDomain[0] * 4 + yDomain[1])/5, 
												(yDomain[0] + yDomain[1] * 4)/5]);
				else {
					var removeElements = Math.ceil(yDomain.length * 0.1);
					yDomain.splice(0, removeElements);
					yDomain.splice(yDomain.length - removeElements );
					if(yDomain.length > 0)
						chart.domainY(yDomain);
				}
				chart.updateAxes();

			}, "Double click to return to original scales");
			chart.panel.add_button("Zoom out", "#zoomOut", function(chart){
				var xDomain = chart.axes.scale_x.domain(),
					yDomain = chart.axes.scale_y.domain();
				if(xDomain.length == 2 && typeof xDomain[0] == "number" && typeof xDomain[1])
					chart.domainX([(xDomain[0] * 6 - xDomain[1])/5, 
												(-xDomain[0] + xDomain[1] * 6)/5]);
				else{
					var addElements = Math.ceil(xDomain.length * 0.1),
						origDomainX = chart.origDomainX(),
						start = origDomainX.indexOf(xDomain[0]),
						end = origDomainX.indexOf(xDomain[xDomain.length - 1]);
					for(var i = start - 1; i >= d3.max([0, start - addElements]); i--)
						xDomain.unshift(origDomainX[i]);
					for(var i = end + 1; i < d3.min([origDomainX.length, end + addElements + 1]); i++)
						xDomain.push(origDomainX[i]);
					chart.domainX(xDomain);
				}
				if(yDomain.length == 2 && typeof yDomain[0] == "number" && typeof yDomain[1])
					chart.domainY([(yDomain[0] * 6 - yDomain[1])/5, 
												(-yDomain[0] + yDomain[1] * 6)/5]);
				else{
					var addElements = Math.ceil(yDomain.length * 0.1),
						origDomainY = chart.origDomainY(),
						start = origDomainY.indexOf(yDomain[0]),
						end = origDomainY.indexOf(yDomain[yDomain.length - 1]);
					for(var i = origDomainY[start - 1]; i >= d3.max([0, start - addElements]); i--)
						yDomain.unshift(origDomainY[i]);
					for(var i = end + 1; i < d3.min([origDomainY.length, end + addElements + 1]); i++)
						yDomain.push(origDomainY[i]);

					chart.domainY(yDomain);
				}
				chart.updateAxes();			
			}, "Double click to return to original scales");
		}
  };	
	
	var inherited_updateSize = chart.updateSize;
	chart.updateSize = function() {
		inherited_updateSize();

		if(chart.transitionDuration() > 0 && !chart.transitionOff){
			var t = d3.transition("size")
				.duration(chart.transitionDuration());
			chart.svg.selectAll(".axes_g").transition(t)
				.attr("transform", "translate(" + chart.margins().left + 
								", " + chart.margins().top + ")");
			chart.axes.x_g.transition(t)
				.attr( "transform", "translate(0," + chart.get_plotHeight() + ")" );
			chart.axes.x_label.transition(t)
				.attr("x", chart.get_plotWidth());

		}	else {
			chart.svg.selectAll(".axes_g")
				.attr("transform", "translate(" + chart.margins().left + 
								", " + chart.margins().top + ")");
			chart.axes.x_g
				.attr( "transform", "translate(0," + chart.get_plotHeight() + ")" );
			chart.axes.x_label
				.attr("x", chart.get_plotWidth());
		}

		chart.updateAxes();

		return chart;
	};

	// This function takes two linear scales, and extends the domain of one of them to get  
	// the desired x:y aspect ratio 'asp'. 
	function fix_aspect_ratio( scaleX, scaleY, asp ) { 
	   var xfactor = ( scaleX.range()[1] - scaleX.range()[0] ) /  
	      ( scaleX.domain()[1] - scaleX.domain()[0] ); 
	   var yfactor = ( scaleY.range()[1] - scaleY.range()[0] ) /  
	      ( scaleY.domain()[1] - scaleY.domain()[0] ); 
	   var curasp = Math.abs( xfactor / yfactor );  // current aspect ratio 
	   if( curasp > asp ) {  // x domain has to be expanded 
	      var cur_dom_length = ( scaleX.domain()[1] - scaleX.domain()[0] ); 
	      var extension = cur_dom_length * ( curasp/asp - 1 ) / 2; 
	      scaleX.domain( [ scaleX.domain()[0] - extension, scaleX.domain()[1] + extension ] );       
	   } else { // y domain has to be expanded 
	      var cur_dom_length = ( scaleY.domain()[1] - scaleY.domain()[0] ); 
	      var extension = cur_dom_length * ( asp/curasp - 1 ) / 2; 
	      scaleY.domain( [ scaleY.domain()[0] - extension, scaleY.domain()[1] + extension ] );             
	   } 
	} 

	var get_ticks = function(axis){
		var ticks = {tickValues: null, tickFormat: null},
			tickArray = chart["ticks" + axis]();
		
		if(tickArray){
			//check if the ticks are set correctly
			if(typeof tickArray.splice === "undefined")
				throw "Error in 'get_ticks': new tick values and labels should be passed " +
							"as an array";
			if(typeof tickArray[0].splice === "undefined")
				tickArray = [tickArray];
			for(var i = 1; i < tickArray.length; i++)
				if(tickArray[0].length != tickArray[i].length)
					throw "Error in 'get_ticks': the amount of tick labels must be equal to the " +
								"amount of tick values";

			//if only tick values (not tick labels) then return 					
			ticks.tickValues = tickArray[0];
			if(tickArray.length == 1)
				return ticks;

			//if all the labels sets are identical, leave only one of them
			var ident = tickArray.length > 2, j = 1, i;
			while(ident && j < tickArray.length - 1){
				i = 0;
				while(ident && i < tickArray[j].length){
					ident = (tickArray[j][i] == tickArray[j + 1][i]);
					i++;
				}
				j++;
			}
			if(ident)
				tickArray.splice(2);
			
			//if we have several label sets, transform the labels into <tspan> blocks
			var tickLabels = [], value;
			if(tickArray.length > 2){
				for(var i = 0; i < tickArray[0].length; i++){
					value = "";
					for(var j = 1; j < tickArray.length; j++){
						//location
						value += "<tspan x = 0.5 dy = " + 1.1 + "em";
						//colour if any
						if(tickArray.colour) 
							value += " fill = '" + tickArray.colour[j - 1] + "'>";
						else
							value += ">";
						value += tickArray[j][i] + "</tspan>";
					}
					tickLabels.push(value);
				}
			} else {
				tickLabels = tickArray[1];
			}
			ticks.tickFormat = function(d) {return tickLabels[ticks.tickValues.indexOf(d)];};
		}
		
		return ticks;
	};

	chart.panMove = function(p){
		var domainX = chart.axes.scale_x.domain(),
			domainY = chart.axes.scale_y.domain();
		
		if(chart.axes.scale_x.invert){
			//x-scale is continuous
			var invPx = chart.axes.scale_x.invert(p[0]),
				moveX = invPx - chart.axes.scale_x.invert(chart.pan("down")[0]);
			chart.pan("down")[0] = p[0];
			var newDomainX = [domainX[0] - moveX, domainX[1] - moveX];
			if(chart.logScaleX()){
				if(newDomainX[0] <= 0) newDomainX[0] = domainX[0];
				if(newDomainX[1] <= 0) newDomainX[1] = domainX[1]; 
			}
			chart.domainX(newDomainX);
		} else {
			//x-scale is categorical
			var moveX = p[0] - chart.pan("down")[0],
				steps = Math.floor(Math.abs(moveX) / chart.axes.scale_x.step() * 2);
			if(steps > 0){
				chart.pan("down")[0] += Math.sign(moveX) * steps * chart.axes.scale_x.step() /2;
				var origDomainX = chart.origDomainX(),
					start = origDomainX.indexOf(domainX[0]),
					end = origDomainX.indexOf(domainX[domainX.length - 1]);
				if(moveX < 0){
					domainX.splice(0, steps);
					domainX = domainX.concat(origDomainX.slice(end + 1, d3.min([origDomainX.length, end + steps + 1])));
				} else {
					domainX.splice(domainX.length - steps);
					domainX = origDomainX.slice(d3.max([0, start - steps]), start).concat(domainX);
				}
				if(domainX.length > 0) chart.domainX(domainX);
			}
		}

		if(chart.axes.scale_y.invert){
			//y-scale is continuous
			var invPy = chart.axes.scale_y.invert(p[1]),
				moveY = invPy - chart.axes.scale_y.invert(chart.pan("down")[1]);
			chart.pan("down")[1] = p[1];
			var newDomainY = [domainY[0] - moveY, domainY[1] - moveY];
			if(chart.logScaleY()){
				if(newDomainY[0] <= 0) newDomainY[0] = domainY[0];
				if(newDomainY[1] <= 0) newDomainY[1] = domainY[1]; 
			}
			chart.domainY(newDomainY);
		} else {
			//y-scale is categorical
			var moveY = p[1] - chart.pan("down")[1],
				steps = Math.floor(Math.abs(moveY) / chart.axes.scale_y.step() * 2);
			if(steps > 0){
				chart.pan("down")[1] += Math.sign(moveY) * steps * chart.axes.scale_y.step() / 2;
				var origDomainY = chart.origDomainY(),
					start = origDomainY.indexOf(domainY[0]),
					end = origDomainY.indexOf(domainY[domainY.length - 1]);
				if(moveY > 0){
					domainY.splice(0, steps);
					domainY = domainY.concat(origDomainY.slice(end + 1, d3.min([origDomainY.length, end + steps + 1])));
				} else {
					domainY.splice(domainY.length - steps);
					domainY = origDomainY.slice(d3.max([0, start - steps]), start).concat(domainY);
				}
				if(domainY.length > 0) chart.domainY(domainY);
			}
		}

		chart.updateAxes();
	};

	var checkType = function(type) {
		var domain = chart["get_domain" + type]();
		
		if(chart.axes["scale_" + type.toLowerCase()] === undefined)
			chart.axes["scale_" + type.toLowerCase()] = {};

		if(domain.length == 2 && typeof (domain[0] + domain[1]) === "number"){
			var logBase = chart["logScale" + type]();
			if(logBase && logBase > 0 && logBase != 1){
				if(chart.axes["scale_" + type.toLowerCase()].base === undefined)
					chart.axes["scale_" + type.toLowerCase()] = d3.scaleLog();
				chart.axes["scale_" + type.toLowerCase()].base(logBase);
			} else {
				if(chart.axes["scale_" + type.toLowerCase()].clamp === undefined || 
					chart.axes["scale_" + type.toLowerCase()].base != undefined)
				chart.axes["scale_" + type.toLowerCase()] = d3.scaleLinear(); 
			}
			chart.axes["scale_" + type.toLowerCase()].nice();
		} else {
			if(chart.axes["scale_" + type.toLowerCase()].padding === undefined)
				chart.axes["scale_" + type.toLowerCase()] = d3.scalePoint()
					.padding(0.3);
		}
	};

	var checkDomain = function(type) {
		var domain = chart["get_domain" + type]();
		if(domain.length == 2 && typeof domain[0] === "number" && typeof domain[1] === "number") {
			if(domain[0] == domain[1]) {
				domain[0] = domain[0] - 0.5;
				domain[1] = domain[1] + 0.5;
			}
			//if(chart["logScale" + type]()){
			//	domain = [d3.max([domain[0], 0.00000000001]), d3.max([domain[1], 0.1])];
			//}
			
		}
		return domain;
	};

	chart.updateAxes = function(){

		checkType("X");
		checkType("Y");

		chart.axes.scale_x.range([0, chart.get_plotWidth()]);
		chart.axes.scale_y.range([chart.get_plotHeight(), 0]);

    chart.axes.x_label
    	.text( chart.axisTitleX());
		chart.axes.y_label
   		.text( chart.axisTitleY() );

    chart.axes.scale_x.domain(checkDomain("X"));
    chart.axes.scale_y.domain(checkDomain("Y"));
		if(chart.aspectRatio())
			fix_aspect_ratio(chart.axes.scale_x, chart.axes.scale_y, chart.get_aspectRatio());

		var ticksX = get_ticks("X"),
			ticksY = get_ticks("Y");

    if(chart.transitionDuration() > 0 && !chart.transitionOff) {
	    var t = d3.transition("axes")
	    	.duration(chart.transitionDuration());
	    d3.axisBottom()
	      .scale( chart.axes.scale_x )
	      .tickValues(ticksX.tickValues)
	      .tickFormat(ticksX.tickFormat)
	      ( chart.axes.x_g.transition(t) );

	    d3.axisLeft()
	      .scale( chart.axes.scale_y )
	      .tickValues(ticksY.tickValues)
	      .tickFormat(ticksY.tickFormat)
	      ( chart.axes.y_g.transition(t) );	
    } else {
	    d3.axisBottom()
	      .tickValues(ticksX.tickValues)
	      .tickFormat(ticksX.tickFormat)
	      .scale( chart.axes.scale_x )
	      ( chart.axes.x_g );

	    d3.axisLeft()
	      .scale( chart.axes.scale_y )
	      .tickValues(ticksY.tickValues)
	      .tickFormat(ticksY.tickFormat) 
	      ( chart.axes.y_g ); 	
    }

    var updateX = function() {
    	chart.axes.x_g.selectAll(".tick").selectAll("text")
    		.html(ticksX.tickFormat);
    };
    if(ticksX.tickFormat)
    	if(chart.transitionDuration() > 0 && !chart.transitionOff)
    		setTimeout(updateX, chart.transitionDuration());
    	else
    		updateX();

    var updateY = function() {
    	chart.axes.y_g.selectAll(".tick").selectAll("text")
    		.html(ticksX.tickFormat);
    };
    if(ticksY.tickFormat)
    	if(chart.transitionDuration() > 0 && !chart.transitionOff)
    		setTimeout(updateY, chart.transitionDuration());
    	else
    		updateY();

    chart.axes.y_g.selectAll(".tick").selectAll("text")
    	.attr("transform", "rotate(-" + chart.ticksRotateY() + ", -9, 0)")
    	.style("text-anchor", chart.ticksRotateY() > 69 ? "middle" : "end")
    	.attr("dy", chart.ticksRotateY() > 69 ? 0 : "0.32em");
    
    chart.axes.x_g.selectAll(".tick").selectAll("text")
    	.attr("transform", "rotate(-" + chart.ticksRotateX() + ")")
    	.style("text-anchor", chart.ticksRotateX() > 19 ? "end" : "middle")
      .attr("dx", chart.ticksRotateX() > 19 ? "-.8em" : 0)
      .attr("dy", chart.ticksRotateX() > 19 ? (0.55 - (chart.ticksRotateX() - 20) * 0.01) + "em" : ".71em");


    for(var k in chart.layers)
    	chart.get_layer(k).updateElementPosition();

    return chart;
	};

	return chart;
}

function line(id, chart){
	
	if(chart === undefined)
		chart = axesChart();
	if(id === undefined)
		id = "layer" + chart.get_nlayers();
	
	var layer = chart.create_layer(id).get_layer(id)
		.add_property("lineFun", undefined, function(value) {
			if(typeof value === "function")
				return value;
			if(typeof value === "string") 
				return new Function("return " + value)()	

			throw "Error in 'typeCheck' for property 'lineFun': value must be a function or" +
				"a string that can be evaluated."
		})
		.add_property("nsteps", 100)
		.add_property("lineWidth", 1.5, check("array_fun", "lineWidth"))
		.add_property("dasharray", undefined, check("array_fun", "dasharray"))
		.add_property("fill", "none", check("array_fun", "fill"));
	chart.syncProperties(layer);
	
	layer.nelements(1);

	layer.updateElements = function(){
		var lines = layer.g.selectAll(".data_element")
			.data(layer.elementIds(), function(d) {return d;});
		lines.exit()
			.remove();
		lines.enter()
			.append("path")
				.attr("class", "data_element")
			.merge(lines)
				.attr("id", function(d) {return "p" + (layer.id + "_" + d).replace(/[ .]/g,"_");})
        .on( "click", layer.get_on_click )
        .on( "mouseover", layer.get_on_mouseover )
        .on( "mouseout", layer.get_on_mouseout );			
	};

	layer.dresser(function(sel){
		sel.attr("stroke", function(d) {return layer.get_colour(d);})
			.attr("stroke-width", function(d) {return layer.get_lineWidth(d);})
			.attr("stroke-dasharray", function(d) {return layer.get_dasharray(d)})
			.attr("opacity", function(d) { return layer.get_opacity(d)} )
			.attr("fill", function(d) {return layer.get_fill(d)});
	});

	layer.findElements = function(lu, rb) {
		var r = 5;
		return layer.g.selectAll("path")
			.filter(function(){
				var line = d3.select(this).attr("d").substr(1)
					.split("L")
						.map(function(e){return e.split(",")});
				var inside = false, i = 0;
				while(!inside && i < line.length){
					if((line[i][0] - r <= rb[0]) && (line[i][1] - r <= rb[1]) && 
          (line[i][0] + r >= lu[0]) && (line[i][1] + r >= lu[1]))
						inside = true;
					i++;
				}
				return inside;
			}).data();
	};

	layer.updateElementPosition = function(){
		var line = d3.line()
			.x(function(c) {return layer.chart.axes.scale_x(c.x);})
			.y(function(c) {return layer.chart.axes.scale_y(c.y);});

		if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff)
			layer.g.selectAll(".data_element").transition("elementPosition")
				.duration(layer.chart.transitionDuration())
				.attr("d", function(d) {return line(layer.get_data(d));});
		else
			layer.g.selectAll(".data_element")
				.attr("d", function(d) {return line(layer.get_data(d));});

		return layer.chart;
	};

  //default hovering behaviour
  layer.on_mouseover(function(d){
    var pos = d3.mouse(layer.chart.container.node());
    //change colour and class
    d3.select(this)
      .attr("stroke", function(d) {
        return d3.rgb(layer.get_colour(d)).darker(0.5);
      })
      .classed("hover", true);
    //show label
    layer.chart.container.selectAll(".inform").data([d])
        .style("left", (pos[0] + 10) + "px")
        .style("top", (pos[1] + 10) + "px")
        .select(".value")
          .html(layer.get_informText(d));  
    layer.chart.container.selectAll(".inform")
      .classed("hidden", false);
  });
  layer.on_mouseout(function(d){
    d3.select(this)
      .attr("stroke", function(d) {
        return layer.get_colour(d);
      })
      .classed("hover", false);
    layer.chart.container.selectAll(".inform")
      .classed("hidden", true);
  });		

  layer.colourMarked = function() {
    var marked = {};
    marked[layer.id] = layer.get_marked();
    marked = layer.chart.get_elements(marked);
    
    if(marked.empty())
      layer.g.selectAll(".data_element")
        .attr("stroke", function(d) {return layer.get_colour(d)});
    else {
      layer.g.selectAll(".data_element")
        .attr("stroke", function(d) {
          return d3.select(this).classed("marked") ? layer.get_colour(d) : "#aaa";
        });
    }
  };	

	return chart;
}

function xLine(id, chart){
	
	var layer = line(id, chart).activeLayer();

	layer.type = "xLine";

	layer.get_data = function(d){
		var domain = layer.layerDomainX();
		if(domain === undefined)
			domain = layer.chart.axes.scale_x.domain();

		//define the length of each step
		var lineStep = (domain[1] - domain[0]) / 
										layer.get_nsteps(d);

		var lineData = [];
		for(var i = domain[0]; i < domain[1]; i += lineStep)
			lineData.push({
				x: i,
				y: layer.get_lineFun(i, d)
			});
							
		var line = d3.line()
			.x(function(c) {return layer.chart.axes.scale_x(c.x);})
			.y(function(c) {return layer.chart.axes.scale_y(c.y);});
							
		return lineData;
	};

	layer.layerDomainY(function() {
		if(layer.layerDomainX()) {
			var elementIds = layer.elementIds(),
				domainY = [];
			for(var i = 0; i < elementIds.length; i++)
				domainY = domainY.concat(d3.extent(layer.get_data(elementIds[i]).map(function(e) {return e.y})));
			return d3.extent(domainY);
		}
	});	

	return layer.chart;
}

function yLine(id, chart){
	
	var layer = line(id, chart).activeLayer();

	layer.type = "yLine";

	layer.get_data = function(d){
		var domain = layer.layerDomainY();
		if(domain === undefined)
			domain = layer.chart.axes.scale_y.domain();

		//define the length of each step
		var lineStep = (domain[1] - domain[0]) / 
										layer.get_nsteps(d);

		var lineData = [];
		for(var i = domain[0]; i < domain[1]; i += lineStep)
			lineData.push({
				y: i,
				x: layer.get_lineFun(i, d)
			});
							
		var line = d3.line()
			.x(function(c) {return layer.chart.axes.scale_x(c.x);})
			.y(function(c) {return layer.chart.axes.scale_y(c.y);});
							
		return lineData;
	};

	layer.layerDomainX(function() {
		if(layer.layerDomainY()){
			var elementIds = layer.elementIds(),
				domainX = [];
			for(var i = 0; i < elementIds.length; i++)
				domainX = domainX.concat(d3.extent(layer.get_data(elementIds[i]).map(function(e) {return e.x})));
			return d3.extent(domainX);
		}
	});	

	return layer.chart;
}

function parametricCurve(id, chart){
	
	var layer = line(id, chart).activeLayer();

	layer.type = "paramCurve";

	layer
		.add_property("xFunction")
		.add_property("yFunction")
		.add_property("paramRange", [0, 1]);
	layer.chart.syncProperties(layer);

	layer.get_data = function(d){
		var paramRange = layer.paramRange();
		
		if(paramRange[1] < paramRange[0])
			paramRange = [paramRange[1], paramRange[0]];

		var lineStep = (paramRange[1] - paramRange[0]) / 
										layer.get_nsteps();

		var lineData = [];
		for(var t = paramRange[0]; t < paramRange[1]; t += lineStep)
			lineData.push({
				x: layer.get_xFunction(t, d),
				y: layer.get_yFunction(t, d)
			});
			
		return lineData;
	};	

	layer.layerDomainX(function() {
		var elementIds = layer.elementIds(),
			domainX = [];
		for(var i = 0; i < elementIds.length; i++)
			domainX = domainX.concat(d3.extent(layer.get_data(elementIds[i]).map(function(e) {return e.x})));
		return d3.extent(domainX);
	});

	layer.layerDomainY(function() {
		var elementIds = layer.elementIds(),
			domainY = [];
		for(var i = 0; i < elementIds.length; i++)
			domainY = domainY.concat(d3.extent(layer.get_data(elementIds[i]).map(function(e) {return e.y})));
		return d3.extent(domainY);
	});

	return layer.chart;
}

function pointLine(id, chart){
	
	var layer = line(id, chart).activeLayer();

	layer.type = "pointLine";

	layer
		.add_property("x", undefined, check("matrix_fun", "x"))
		.add_property("y", undefined, check("matrix_fun", "y"));
	layer.chart.syncProperties(layer);

	layer.get_data = function(d){
		var lineData = [];		
		for(var t = 0; t < layer.nsteps(); t++)
			lineData.push({
				x: layer.get_x(t, d),
				y: layer.get_y(t, d)
			});
			
		return lineData;
	};		
	
	layer.layerDomainX(function() {
		var domain = [];
		layer.elementIds().map(function(id) {
			return d3.extent(d3.range(layer.nsteps()).map(function(e){
				return layer.get_x(e, id);
			}))
		}).forEach(function(e) {domain = domain.concat(e);});

		return d3.extent(domain);
	});

	layer.layerDomainY(function() {
		var domain = [];
		layer.elementIds().map(function(id) {
			return d3.extent(d3.range(layer.nsteps()).map(function(e){
				return layer.get_y(e, id);
			}))
		}).forEach(function(e) {domain = domain.concat(e);});

		return d3.extent(domain);
	});

	return layer.chart;
}

function pointRibbon(id, chart) {

	var layer = pointLine(id, chart).activeLayer();

	layer
		.add_property("ymax", undefined, check("matrix_fun", "ymax"))
		.add_property("ymin", undefined, check("matrix_fun", "ymin"));

	layer.type = "pointRibbon";
	layer.chart.syncProperties(layer);

	layer.opacity(0.33)
		.lineWidth(0);

	layer.get_data = function(d){
		var lineData = [];		
		for(var t = 0; t < layer.nsteps(); t++)
			lineData.push({
				x: layer.get_x(t, d),
				y: layer.get_ymin(t, d)
			});
		for(var t = layer.nsteps() - 1; t >= 0; t--)
			lineData.push({
				x: layer.get_x(t, d),
				y: layer.get_ymax(t, d)
			});
		return lineData;
	};

	layer.dresser(function(sel){
		sel.attr("fill", function(d) {return layer.get_colour(d);})
			.attr("stroke-width", function(d) {return layer.get_lineWidth(d);})
			.attr("stroke-dasharray", function(d) {return layer.get_dasharray(d)})
			.attr("opacity", function(d) { return layer.get_opacity(d)} );
	});

	layer.layerDomainX(function() {
		var domain = [];
		layer.elementIds().map(function(id) {
			return d3.range(layer.nsteps()).map(function(e){
				if(domain.length == 0)
					domain = [layer.get_x(e, id), layer.get_x(e, id)];
				else {
					domain[0] = d3.min([layer.get_x(e, id), domain[0]]);
					domain[1] = d3.max([layer.get_x(e, id), domain[1]]);
				}
			})
		});

		return domain;
	});

	layer.layerDomainY(function() {
		var domain = [];
		layer.elementIds().map(function(id) {
			return d3.range(layer.nsteps()).map(function(e){
				if(domain.length == 0)
					domain = [layer.get_y(e, id), layer.get_y(e, id)];
				else {
					domain[0] = d3.min([domain[0], layer.get_ymax(e, id), layer.get_ymin(e, id)]);
					domain[1] = d3.max([domain[1], layer.get_ymax(e, id), layer.get_ymin(e, id)]);
				}
			})
		});

		return domain;
	});


	return layer.chart;
}

function scatter(id, chart) {

	if(chart === undefined)
		chart = axesChart();
	if(id === undefined)
		id = "layer" + chart.get_nlayers();

  var layer = chart.create_layer(id).get_layer(id)
		.add_property("x", undefined, check("array_fun", "x"))
		.add_property("y", undefined, check("array_fun", "y"))
    .add_property("size", 6, check("array_fun", "size"))
    .add_property("stroke", function(d) {
      return d3.rgb(layer.get_colour(d)).darker(0.8)
    }, check("array_fun", "stroke"))
    .add_property("strokeWidth", function(d) {
      return layer.get_size(d) * 0.1;
    }, check("array_fun", "strokeWidth"))
    .add_property("symbol", "Circle", check("array_fun", "symbol"))
    .add_property("symbolValue", undefined, check("array_fun", "symbolValue"))
    .add_property("symbolLegendTitle", function(){return "symbol_" + layer.id});
		//.add_property("groupName", function(i){return i;})

	chart.syncProperties(layer);
  layer.type = "scatter";

  layer.mode("default");

  layer.chart.informText(function(id){      
    var x = layer.get_x(id),
      y = layer.get_y(id);
    if(x.toFixed) x = x.toFixed(2);
    if(y.toFixed) y = y.toFixed(2);
    return "ID: <b>" + layer.get_label(id) + "</b>;<br>" + 
          "x = " + x + ";<br>" + 
          "y = " + y
  });

  // Set default for numPoints, namely to count the data provided for x
  layer.nelements( function() {
    var val;
    for( var i = 0; i < 100000; i++ ) {
      try {
        // try to get a value
        val = layer.get_x(i);
      } catch( exc ) {
        // if call failed with exception, report the last successful 
        // index, if any, otherwise zero
        return i >= 0 ? i : 0;  
      }
      if( val === undefined ) {
        // same again: return last index with defines return, if any,
        // otherwise zero
        return i >= 0 ? i : 0;  
      }
    }
    // If we exit the loop, there is either something wrong or there are
    // really many points
    throw "There seem to be very many data points. Please supply a number via 'nelements'."
  });

  var symbolValue = layer.symbolValue;
  layer.symbolValue = function(vf, propertyName, overrideFunc) {
    var returnedValue = symbolValue(vf, propertyName, overrideFunc);
    layer.resetSymbolScale();
    return returnedValue;
  };

  //These functions are used to react on clicks
  layer.findElements = function(lu, rb){
    return layer.elementIds()
      .filter(function(id) {
        var loc = [layer.chart.axes.scale_x(layer.get_x(id)), 
                  layer.chart.axes.scale_y(layer.get_y(id))];
        return (loc[0] - layer.get_size(id) - 1 <= rb[0]) && 
          (loc[1] - layer.get_size(id) - 1 <= rb[1]) && 
          (loc[0] + layer.get_size(id) + 1 >= lu[0]) && 
          (loc[1] + layer.get_size(id) + 1 >= lu[1]);
      });
  };
  layer.get_position = function(id){
    return [layer.chart.axes.scale_x(layer.get_x(id)), 
            layer.chart.axes.scale_y(layer.get_y(id))];
  }; 

	layer.layerDomainX(function() {
		var vals = layer.elementIds()
      .map(function(el) { return layer.get_x(el);})
      .filter(function(el) {return !lc.isNaN(el)});
    var allNums = true, i = 0;
    //logscale can use only numeric and only positive values
    if(layer.chart.logScaleX())
      return d3.extent(vals.filter(function(e) {return e > 0}))
  

    while(allNums && i < vals.length){
      if(!(typeof vals[i] == "number"))
        allNums = false;
      i++;
    }

    if(allNums)
      return d3.extent(vals)
    else 
      return vals;
	});
	layer.layerDomainY(function() {
    var vals = layer.elementIds()
      .map(function(e) { return layer.get_y(e);})
      .filter(function(el) {return !lc.isNaN(el)});
    var allNums = true, i = 0;
    
    //logscale can use only numeric and only positive values
    if(layer.chart.logScaleY())
      return d3.extent(vals.filter(function(e) {return e > 0}))

    while(allNums && i < vals.length){
      if(!(typeof vals[i] == "number"))
        allNums = false;
      i++;
    }

    if(allNums)
      return d3.extent(vals)
    else 
      return vals;
	});

  layer.resetSymbolScale = function() {
    //get range of symbol values
    var range = [], ids = layer.elementIds();
    for(var i = 0; i < ids.length; i++)
      if(range.indexOf(layer.get_symbolValue(ids[i])) == -1)
        range.push(layer.get_symbolValue(ids[i]));

    var symbols = ["Circle", "Cross", "Diamond", "Square",
                    "Star", "Triangle", "Wye"];

    layer.symbolScale = d3.scaleOrdinal()
      .domain(range)
      .range(symbols);

    layer.symbol(function(id) {
      return layer.symbolScale(layer.get_symbolValue(id));
    });

    if(layer.chart.showLegend()) {
      layer.addLegendBlock(layer.symbolScale, "symbol", layer.id + "_symbol");
      var tObj = {};
      tObj[layer.id + "_symbol"] = layer.symbolLegendTitle();
      layer.chart.legend.set_title(tObj);
    }

  };

  var get_mode = function() {
    if(layer.mode() == "default")
      return layer.nelements() > 2500 ? "canvas" : "svg";
    return layer.mode();
  };  

  layer.updateElementPosition = function(){
    if(!layer.checkMode())
      return chart;    

    if(get_mode() == "svg") {
      var placeElement = function(d) {
        var x = layer.chart.axes.scale_x( layer.get_x(d) ),
          y = layer.chart.axes.scale_y( layer.get_y(d) );
        return (x == undefined || y == undefined) ? "translate(-100, 0)" :
          "translate(" + x + ", " + y + ")";
      };

      if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff){
        layer.g.selectAll(".data_element").transition("elementPosition")
          .duration(layer.chart.transitionDuration())
          .attr("transform", placeElement);
      } else {
        layer.g.selectAll(".data_element")
          .attr("transform", placeElement);
      }
      var domainX = layer.chart.axes.scale_x.domain(),
        domainY = layer.chart.axes.scale_y.domain();
      
      var notShown = layer.g.selectAll(".data_element")
        .filter(function(d) {
          return (layer.chart.axes.scale_x.invert != undefined && 
                    (layer.get_x(d) > domainX[1] || layer.get_x(d) < domainX[0])) ||
                  (layer.chart.axes.scale_y.invert != undefined &&
                    (layer.get_y(d) > domainY[1] || layer.get_y(d) < domainY[0]));
        }).data();
      
      var outTicks = layer.g.selectAll(".out_tick").data(notShown, function(d) {return d});
      outTicks.exit().remove();
      outTicks.enter()
        .append("rect")
          .attr("class", "out_tick")
          .attr("fill", function(d){return layer.get_colour(d)})
          .merge(outTicks)
            .attr("width", function(d){
              return layer.chart.axes.scale_y.invert != undefined &&
                        (layer.get_y(d) > domainY[1] || layer.get_y(d) < domainY[0]) ? 4 : 12;
            })
            .attr("height", function(d){
              return layer.chart.axes.scale_x.invert != undefined && 
                       (layer.get_x(d) > domainX[1] || layer.get_x(d) < domainX[0]) ? 4 : 12;
            })
            .attr("x", function(d){
              if(layer.chart.axes.scale_x.invert != undefined)
                return d3.max([layer.chart.axes.scale_x(domainX[0]), 
                  layer.chart.axes.scale_x(d3.min([layer.get_x(d), domainX[1]])) - d3.select(this).attr("width")])
              else
                return layer.chart.axes.scale_x(layer.get_x(d));
            })
            .attr("y", function(d){
              if(layer.chart.axes.scale_y.invert != undefined)
                return d3.min([layer.chart.axes.scale_y(domainY[0]) - d3.select(this).attr("height"), 
                  layer.chart.axes.scale_y(d3.min([layer.get_y(d), domainY[1]]))])
              else
                return layer.chart.axes.scale_y(layer.get_y(d));
            })
            .on("mousedown", function(d){
              if(layer.chart.axes.scale_x.invert != undefined)
                layer.chart.domainX([d3.min([domainX[0], layer.get_x(d)]), d3.max([domainX[1], layer.get_x(d)])]);
              if(layer.chart.axes.scale_y.invert != undefined)
                layer.chart.domainY([d3.min([domainY[0], layer.get_y(d)]), d3.max([domainY[1], layer.get_y(d)])]);
              layer.chart.updateAxes();
            });
    } else {
      if(!layer.updateStarted)
        layer.updateCanvas();
    } 
    return chart;
  };

//not used
/*  layer.updateSelElementStyle = function(id){
    if(typeof id.length === "undefined")
      id = [id];
    if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff)
      for(var i = 0; i < id.length; i++)
        layer.g.selectAll("#p" + id[i]).transition("elementStyle")
          .duration(layer.chart.transitionDuration())
          .attr( "r", function(d) {return layer.get_size(d)})
          .attr( "fill", function(d) { return layer.get_colour(d)})
          .attr( "style", function(d) { return layer.get_style(d)})
          .attr( "opacity", function(d) { return layer.get_opacity(d)} )
    else
      for(var i = 0; i < id.length; i++)
        layer.g.selectAll("#p" + id[i])
          .attr( "r", layer.get_size(id[i]))
          .attr( "fill", layer.get_colour(id[i]))
          .attr( "style", layer.get_style(id[i]))
          .attr( "opacity", function(d) { return layer.get_opacity(d)} );      
    return layer;
  } */

  layer.updateElementStyle = function() {
    if(!layer.checkMode())
      return chart;

    layer.resetColourScale();

    if(get_mode() == "svg") {

       var sel = layer.g.selectAll(".data_element");
      if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff && layer.get_marked().length == 0)
        sel = sel.transition("elementStyle")
          .duration(layer.chart.transitionDuration());
      sel
        .attr("d", function(d) {
          return d3.symbol()
            .type(d3["symbol" + layer.get_symbol(d)])
            .size(get_symbolSize(layer.get_symbol(d), layer.get_size(d)))();
        })
        .attr("fill", function(d) {

          return layer.get_colour(d)
        })
        .attr("stroke", function(d) {return layer.get_stroke(d)})
        .attr("stroke-width", function(d) {return layer.get_strokeWidth(d)})
        .attr("opacity", function(d) { return layer.get_opacity(d)} );

      if(layer.get_marked().length != 0)
        layer.colourMarked();

    } else {
      if(!layer.updateStarted)
        layer.updateCanvas();
    }
    return chart;
  };

  layer.dresser(function(sel) {
    sel.attr("fill", function(d) {return layer.get_colour(d);})
      .attr("r", function(d) {return layer.get_size(d);});
  });

  layer.updateElements = function() {
    if(!layer.checkMode())
      return chart;

    if(get_mode() == "svg") {
      var sel = layer.g.selectAll( ".data_element" )
        .data( layer.elementIds(), function(d) {return d;} );
      sel.exit()
        .remove();  
      sel.enter().append( "path" )
        .attr( "class", "data_element" )
        .merge(sel)
          .attr("id", function(d) {return "p" + (layer.id + "_" + d).replace(/[ .]/g,"_");})
          .on( "click", layer.get_on_click )
          .on( "mouseover", layer.get_on_mouseover )
          .on( "mouseout", layer.get_on_mouseout );
    } else {
      if(!layer.updateStarted)
        layer.updateCanvas();
    }
    return chart;
  };

  layer.updateCanvas = function() {
    var ids = layer.elementIds();
    var ctx = layer.canvas.node().getContext("2d");
    ctx.clearRect(0, 0, chart.plotWidth(), chart.plotHeight());

    var p, x, y;
    for(var i = 0; i < ids.length; i++) {
      ctx.strokeStyle = layer.get_stroke(ids[i]);
      ctx.lineWidth = layer.get_strokeWidth(ids[i]);
      if(layer.marked.length != 0 && layer.marked.indexOf(ids[i]) == -1)
        ctx.fillStyle = "#aaa";
      else       
        ctx.fillStyle = layer.get_colour(ids[i]);
      
      ctx.globalAlpha = layer.get_opacity(ids[i]);

      x = layer.chart.axes.scale_x( layer.get_x(ids[i]) ),
      y = layer.chart.axes.scale_y( layer.get_y(ids[i]) );
      if (x == undefined || y == undefined) {
        x = -100;
        y = 0;
      }
      ctx.translate(x, y);

      p = new Path2D(d3.symbol()
                  .type(d3["symbol" + layer.get_symbol(ids[i])])
                  .size(get_symbolSize(layer.get_symbol(ids[i]), layer.get_size(ids[i])))());
      

      ctx.stroke(p);
      ctx.fill(p);
      ctx.translate(-x, -y);
    }
  };

  return chart;
}

function beeswarm(id, chart) {

	if(chart === undefined)
		chart = axesChart();
	if(id === undefined)
		id = "layer" + chart.get_nlayers();

  scatter(id, chart);
  
  var layer = chart.get_layer(id);
  layer.add_property("valueAxis", "y", function(value){
    if(value != "x" && value != "y" && typeof value != "function")
      throw "Error in 'typeCheck' for 'valueAxis': axis name" +
            "should be 'x' or 'y'";
    return value;
  });
	chart.syncProperties(layer);
  layer.type = "beeswarm";

  var inherited_updateElementPosition = layer.updateElementPosition;
  layer.updateElementPosition = function(){
    inherited_updateElementPosition();

    var orientation = (layer.valueAxis() == "y" ? "vertical" : "horizontal");
    var swarm = d3.beeswarm()
      .data(layer.elementIds().sort(function(a, b){
        return layer["get_" + layer.valueAxis()](a) - layer["get_" + layer.valueAxis()](b); 
      }))
      .distributeOn(function(d){
        return layer.chart.axes["scale_" + layer.valueAxis()](layer["get_" + layer.valueAxis()](d));
      })
      .axis(function(d){
        if(layer.valueAxis() == "x")
          return layer.chart.axes.scale_y(layer.get_y(d))
        else
          return layer.chart.axes.scale_x(layer.get_x(d))
      })
      .radius(layer.size())
      .arrange();

    swarm.res = {};
    for(var i = 0; i < swarm.length; i++)
      swarm.res[swarm[i].datum] = swarm[i];

    if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff){
      layer.g.selectAll(".data_element").transition("elementPosition")
        .attr("transform", function(d){
          if(layer.valueAxis() == "x")
            return "translate(" + layer.chart.axes.scale_x( layer.get_x(d) ) +
                    ", " + swarm.res[d].x + ")"
          else
          return "translate(" + swarm.res[d].y +
                  ", " + layer.chart.axes.scale_y( layer.get_y(d) ) + ")";
        });
    } else {
      layer.g.selectAll(".data_element")
        .attr("transform", function(d){
          if(layer.valueAxis() == "x")
            return "translate(" + layer.chart.axes.scale_x( layer.get_x(d) ) +
                    ", " + swarm.res[d].x + ")"
          else
          return "translate(" + swarm.res[d].y +
                  ", " + layer.chart.axes.scale_y( layer.get_y(d) ) + ")";
        });
    }

  };

  return chart;
}

function barchart(id, chart){
	
	if(chart === undefined)
		chart = axesChart();
	if(id === undefined)
		id = "layer" + chart.get_nlayers();
	
	var layer = chart.create_layer(id).get_layer(id)
		.add_property("ngroups", undefined, check("number_nonneg", "ngroups"))
		.add_property("groupIds", undefined, check("array", "groupIds"))
		.add_property("nbars", undefined, check("number_nonneg", "nbars"))
		.add_property("barIds", undefined, check("array", "barIds"))
		.add_property("nstacks", undefined, check("number_nonneg", "nstacks"))
		.add_property("stackIds", undefined, check("array", "stackIds"))
		.add_property("value", undefined, function(value) {
			if(typeof value === "function")
				return value;

			var inds;
			if(typeof value === "object") {
				if(value.__inds__) {
					inds = value.__inds__;
					value.__inds__ = null;
				}
				var groups = Object.keys(value);
				if(typeof value[groups[0]] === "object") {
					var bars = Object.keys(value[groups[0]]);
					if(typeof value[groups[0]][bars[0]] === "object") {
						var stacks = Object.keys(value[groups[0]][bars[0]]);
						if(typeof value[groups[0]][bars[0]][stacks[0]] === "object")
							return function(groupId, barId, stackId) {
								if(inds) groupId = inds.indexOf(groupId) + 1;
								return value[groupId][barId][stackId][0];
							}
						else
							return function(groupId, barId, stackId) {
								if(inds) groupId = inds.indexOf[groupId] + 1;
								return value[groupId][barId][stackId];
							}
					}
				}
			}

		  throw "Error in 'typeCheck' for property 'value" + 
     			   "': the value is not an array or an object."

		})
		.add_property("groupWidth", 0.6)
		.add_property("stroke", "#444")
		.add_property("strokeWidth", 0);

	layer.chart.syncProperties(layer);
	layer.type = "barchart";

	layer.chart.informText(function(groupId, barId, stackId){
			var id = groupId;
			if(layer.nbars() > 1) id += ", " + barId;
			if(layer.nstacks() > 1) id += ", " + stackId;
			return "ID: <b>" + id + "</b>;<br>" + 
            "value = " + layer.get_value(groupId, barId, stackId).toFixed(2)
		});

	//setting a number of elements or their IDs should replace
	//each other
	["group", "bar", "stack"].forEach(function(name){
		//if number of elements is set, define their IDs
		layer.wrapSetter("n" + name + "s", function(oldSetter){
			return function() {
				layer["get_" + name + "Ids"] = function(){
					return d3.range(oldSetter());
				};
				return oldSetter.apply(layer, arguments);
			}
		});
		//if element IDs are set, define their number
		layer.wrapSetter(name + "Ids", function(oldSetter){
			return function() {
				layer["get_n" + name + "s"] = function(){
					return oldSetter().length;
				};
				return oldSetter.apply(layer, arguments);
			}
		});
	});

	layer.nbars(1);
	layer.nstacks(1);
	layer.contScaleX(false);
	layer.elementIds(function(){
		if(layer.nbars() == 1 && (layer.barIds()[0] == 0 || layer.barIds()[0] == 1))
			return layer.stackIds();
		var ids = [], barIds = layer.barIds(), stackIds = layer.stackIds();
		for(var i = 0; i < layer.nbars(); i++)
			for(var j = 0; j < layer.nstacks(); j++)
				ids.push(barIds[i] + ", " + stackIds[j]);
		return ids;
	});
	layer.colourValue(function(id) {
		if(id.split && layer.nstacks() == 1 && (layer.stackIds()[0] == 0 || layer.stackIds()[0] == 1))
			return id.split(", ")[0].toString()
		else 
			return id.toString();
	});
	layer.colour(function(gropuId, barId, stackId) {
      if((layer.nbars() == 1) && (barId == 0 || barId == 1)) //if the bars are not named, default ID is 0 in JS and 1 in R
      		return layer.colourScale(layer.get_colourValue(stackId))
      else
      	return layer.colourScale(layer.get_colourValue(barId + ", " + stackId));
    });
	layer.addColourScaleToLegend(true);

	layer.layerDomainX(function() {
		var groupIds = layer.groupIds();
		if(layer.contScaleX())
			return [d3.min(groupIds), d3.max(groupIds)]
		else
			return layer.groupIds();
	});
	layer.layerDomainY(function(){
		//go through all bars and find the highest
		var barIds = layer.barIds(),
			groupIds = layer.groupIds(),
			stackIds = layer.stackIds(),
			maxHeight = 0, curHeihgt;
		for(var i = 0; i < layer.ngroups(); i++)
			for(var j = 0; j < layer.nbars(); j++){
				curHeihgt = 0;
				for(var k = 0; k < layer.nstacks(); k++)
					curHeihgt += layer.get_value(groupIds[i], barIds[j], stackIds[k]);
				if(curHeihgt > maxHeight) maxHeight = curHeihgt;
			}

		return [0, maxHeight];
	});

  //default hovering behaviour
  layer.on_mouseover(function(d){
    var pos = d3.mouse(chart.container.node());
    //change colour and class
    d3.select(this)
      .attr("fill", function(d) {
        return d3.rgb(layer.get_colour(d[0], d[1], d[2])).darker(0.5);
      })
      .classed("hover", true);
    //show label
    layer.chart.container.select(".inform")
        .style("left", (pos[0] + 10) + "px")
        .style("top", (pos[1] + 10) + "px")
        .select(".value")
          .html(layer.get_informText(d[0], d[1], d[2]));  
    layer.chart.container.select(".inform")
      .classed("hidden", false);
  });
  layer.on_mouseout(function(d){
  	var mark = layer.get_marked().length > 0;

    d3.select(this)
      .attr("fill", function(d) {
      	return mark ^ d3.select(this).classed("marked") ?
        		"#aaa" : layer.get_colour(d[0], d[1], d[2]);
      })
      .classed("hover", false);
    layer.chart.container.select(".inform")
      .classed("hidden", true);
  });


	layer.findElements = function(lu, rb){
		return layer.g.selectAll(".data_element")
			.filter(function(){
				var x = +d3.select(this).attr("x"),
					y = +d3.select(this).attr("y"),
					width = +d3.select(this).attr("width"),
					height = +d3.select(this).attr("height");

				return (lu[0] <= x + width && rb[0] > x && 
								lu[1] <= y + height && rb[1] > y)
			}).data();
	};
	layer.get_position = function(id){
		//gets id as data (so here we have an array of three ids)
		return [layer.g.select("#p" + id.join("_")).attr("x"),
						layer.g.select("#p" + id.join("_")).attr("y")];
	};

	layer.updateElementPosition = function(){
		var groupWidth, groupIds = layer.groupIds();
		if(layer.contScaleX())
			groupWidth = Math.abs(layer.chart.axes.scale_x(groupIds[1]) - layer.chart.axes.scale_x(groupIds[0])) * layer.groupWidth();
		else
			groupWidth = layer.chart.axes.scale_x.step() * layer.groupWidth();

		var barWidth = groupWidth/layer.nbars(),
			//for now it's just a linear scale
			heightMult = Math.abs(layer.chart.axes.scale_y(1) - layer.chart.axes.scale_y(0)),
			groupScale = d3.scaleLinear()
				.domain([0, layer.nbars() - 1])
				.range([-groupWidth/2, groupWidth/2 - barWidth]),
			barIds = layer.barIds(),
			stackIds = layer.stackIds();
		if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff){
			layer.g.selectAll(".data_element").transition("elementPosition")
				.duration(layer.chart.transitionDuration())
				.attr("width", barWidth)
				.attr("height", function(d){ 
					return layer.get_value(d[0], d[1], d[2]) * heightMult;
				})
				.attr("x", function(d){
					if(layer.chart.axes.scale_x(d[0]) == undefined)
						return -500;
					return groupScale(barIds.indexOf(d[1])) + 
						layer.chart.axes.scale_x(d[0]);
				})
				.attr("y", function(d){
					var height = 0;
					for(var i = 0; i <= stackIds.indexOf(d[2]); i++)
						height += layer.get_value(d[0], d[1], stackIds[i]);
					return layer.chart.axes.scale_y(height);
				});
		}	else {
			layer.g.selectAll(".data_element")
				.attr("width", barWidth)
				.attr("height", function(d){ 
					return layer.get_value(d[0], d[1], d[2]) * heightMult;
				})
				.attr("x", function(d){
					if(layer.chart.axes.scale_x(d[0]) == undefined)
						return -500;
					return groupScale(barIds.indexOf(d[1])) + 
						layer.chart.axes.scale_x(d[0]);
				})
				.attr("y", function(d){
					var height = 0;
					for(var i = 0; i <= stackIds.indexOf(d[2]); i++)
						height += layer.get_value(d[0], d[1], stackIds[i]);
					return layer.chart.axes.scale_y(height);
				});
		}

		return layer;			
	};
	layer.updateElementStyle = function(){
		layer.resetColourScale();
    var sel = layer.g.selectAll(".data_element");
    if(layer.chart.transitionDuration() > 0 && !layer.chart.transitionOff && layer.get_marked().length == 0)
      sel = sel.transition("elementStyle")
        .duration(layer.chart.transitionDuration());

		sel
			.attr("fill", function(d) {
				return layer.get_colour(d[0], d[1], d[2]);
			})
			.attr("stroke", function(d) {
				return layer.get_stroke(d[0], d[1], d[2]);
			})
			.attr("stroke-width", function(d) {
				return layer.get_strokeWidth(d[0], d[1], d[2]);
			})
			.attr("opacity", function(d){
				return layer.get_opacity(d[0], d[1], d[2]);
			});

			if(layer.get_marked().length != 0)
				layer.colourMarked();

	};

	layer.updateElements = function(){
		
		var groups = layer.g.selectAll(".group")
			.data(layer.groupIds(), function(d) {return d;});
		groups.exit()
			.remove();
		groups.enter()
			.append("g")
				.attr("class", "group");

		var bars = layer.g.selectAll(".group").selectAll(".bar")
			.data(function(d) {
				return layer.barIds().map(function(e){
					return [d, e];
				})
			}, function(d) {return d;});
		bars.exit()
			.remove();
		bars.enter()
			.append("g")
				.attr("class", "bar");

		var stacks = layer.g.selectAll(".group").selectAll(".bar").selectAll(".data_element")
			.data(function(d){
				return layer.stackIds().map(function(e){
					return d.concat(e);
				})
			}, function(d) {return d;});
		stacks.exit()
			.remove();
		stacks.enter()
			.append("rect")
				.attr("class", "data_element")
				.merge(stacks)
					.attr("id", function(d) {return "p" + layer.id + "_" + d.join("_").replace(/[ .]/g, "_")})
					.on( "click", function(d) {layer.get_on_click(d[0], d[1], d[2]);} )
        	.on( "mouseover", layer.get_on_mouseover )
        	.on( "mouseout", layer.get_on_mouseout );		
	};

  layer.colourMarked = function() {
    var marked = {};
    marked[layer.id] = layer.get_marked();
    marked = layer.chart.get_elements(marked);
    
    if(marked.empty())
      layer.g.selectAll(".data_element")
        .attr("fill", function(d) {return layer.get_colour(d[0], d[1], d[2])});
    else {
      layer.g.selectAll(".data_element")
        .attr("fill", function(d) {
          return d3.select(this).classed("marked") ? layer.get_colour(d[0], d[1], d[2]) : "#aaa";
        });
    }
  };	

	return layer.chart;
}

function layerChart(){
	var chart = chartBase()
		.add_property("activeLayer", undefined)
		.add_property("layerIds", function() {return Object.keys(chart.layers);}, check("array", "layerIds"))
		.add_property("layerType", function(id) {return chart.get_layer(id).type;}, check("array_fun", "layerType"))
		.add_property("globalColourScale", true);

	//Basic layer functionality
	chart.layers = {};
	var findLayerProperty = function(propname){
		return function() {
			if(chart.get_activeLayer()[propname])
				return chart.get_activeLayer()[propname].apply(chart, arguments)
			else {
				for(var i in chart.layers)
					if(chart.layers[i][propname])
						return chart.layers[i][propname].apply(chart, arguments);
				return;
			}
		}
	};
	chart.syncProperties = function(layer){
		for(var i = 0; i < layer.propList.length; i++)
			if(typeof chart[layer.propList[i]] === "undefined"){
				chart[layer.propList[i]] = findLayerProperty(layer.propList[i]);
				chart["get_" + layer.propList[i]] = findLayerProperty("get_" + layer.propList[i]);
			}
	};

	chart.get_nlayers = function() {
		return Object.keys(chart.layers).length;
	};
	chart.get_layer = function(id) {
		if(Object.keys(chart.layers).indexOf(id) == -1)
			throw "Error in 'get_layer': layer with id " + id +
				" is not defined";

		return chart.layers[id];
	};
	chart.create_layer = function(id) {
		if(typeof id === "undefined")
			id = "layer" + chart.get_nlayers();

		var layer = layerBase(id);
		layer.chart = chart;
		chart.layers[id] = layer;
		chart.activeLayer(chart.get_layer(id));

		return chart;
	};
	chart.add_layer = function(id) {
		if(typeof id === "undefined")
			id = "layer" + chart.get_nlayers();

		var type;
		try {
			type = chart.get_layerType(id);
		} catch (exc) {}

		if(typeof type === "undefined"){
			chart.create_layer(id);
		} else {
			if(type == "scatter")
				scatter(id, chart);
			if(type == "xLine")
				xLine(id, chart);
			if(type == "yLine")
				yLine(id, chart);
			if(type == "paramCurve")
				parametricCurve(id, chart);
			if(type == "bar")
				barchart(id, chart);
			if(type == "beeswarm")
				beeswarm(id, chart);
		}
		return chart;
	};
	chart.remove_layer = function(id) {
		if( Object.keys(chart.layers).indexOf(id) == -1)
			return -1;
		//clean the legend
		for(i in chart.layers[id].legendBlocks)
			chart.legend.remove(i);
		try {
			chart.layers[id].g.remove();
		} catch(exc) {}
		delete chart.layers[id];

		return 0;
	};
	chart.select_layers = function(ids) {
		if(typeof ids === "undefined")
			ids = chart.layerIds();

		var layerSelection = {};
		layerSelection.layers = {};
		//extract or initialise all the requested layers
		for(var i = 0; i < ids.length; i++)
			if(chart.layerIds().indexOf(ids[i]) != -1) {
				if(typeof chart.layers[ids[i]] === "undefined"){
					chart.add_layer(ids[i]);
					if(chart.svg)
						chart.get_layer(ids[i]).put_static_content();
				}
				layerSelection.layers[ids[i]] = chart.get_layer(ids[i]);
			} else {
				ids.splice(i, 1);
				i--;
			}
		if(Object.keys(layerSelection.layers).length == 0){
			for(i in chart)
				layerSelection[i] = function() {return layerSelection};
			return layerSelection;
		}
		//construct generalised property functions
		//note, that only the properties shared between layers
		//can  be generalized
		var prop, flag, j;
		for(var j = 0; j < ids.length; j++)
			for(var i = 0; i < layerSelection.layers[ids[j]].propList.length; i++){
				prop = layerSelection.layers[ids[j]].propList[i];
				if(typeof layerSelection[prop] === "undefined")
					layerSelection[prop] = (function(prop) {return function(val){
						var vf;
						if(typeof val !== "function")
							vf = function() {return val;};
						else
							vf = val;
						for(var i = 0; i < ids.length; i++)
							if(typeof layerSelection.layers[ids[i]][prop] !== "undefined")
								layerSelection.layers[ids[i]][prop]( (function(id) {return function(){ 
									var args = [];
									for(var j = 0; j < arguments.length; j++)
										args.push(arguments[j]);
									args.unshift(id);
									return vf.apply(undefined, args); 
								} })(ids[i]));
						return layerSelection;
					} })(prop);
			}
		if(layerSelection.length == 0)
			return chart;
		return layerSelection;
	};

	var domains = {};
	chart.globalColourDomain = function(layerId, domain) {
		if(layerId !== undefined) 
			domains[layerId] = domain;

		var mainDomain = [];
		for(var d in chart.layers) {
			if(!domains[d])
				domains[d] = chart.get_layer(d).colourDomain();
			mainDomain = mainDomain.concat(domains[d]);
		}
		mainDomain.filter(function(el, ind, self) {
			return el !== undefined && self.indexOf(el) === ind;
		});

		return mainDomain;
	};

	chart.place_layer = function(id){
		chart.get_layer(id).put_static_content();
		//chart.get_layer(id).updateSize();
		chart.get_layer(id).update();
	};

	var inherited_put_static_content = chart.put_static_content;
	chart.put_static_content = function(element){
		inherited_put_static_content(element);

		add_click_listener(chart);
		for(var k in chart.layers)
			chart.get_layer(k).put_static_content();		
	};

	chart.findElements = function(lu, rb){
		var selElements = {};
		Object.keys(chart.layers).forEach(function(layerId){
			selElements[layerId] = chart.get_layer(layerId).findElements(lu, rb);
		});
		return selElements;
	};	

	chart.get_elements = function(ids){
		if(typeof ids !== "object")
			ids = [ids];
		if(Array.isArray(ids))
			if(chart.get_nlayers() == 1){
				var tmp = ids;
				ids = {};
				ids[Object.keys(chart.layers)[0]] = tmp;
			} else {
				throw "Error in 'get_elements': layerId is not defined";
			}
		
		var selectedIds = [], canv = {};
		for(var i in ids) {
			if(chart.get_layer(i).canvas && chart.get_layer(i).canvas.classed("active"))
				canv[i] = ids[i];
			else
				selectedIds = selectedIds
					.concat(ids[i].map(function(e) {
						if(typeof e === "object")
							e = e.join("_");
						return ("p" + i + "_" + e).replace(/[ .]/g, "_")
					}));
		}
		
		var points = (selectedIds.length == 0 ? d3.select("_______") : 
					chart.svg.selectAll(".chart_g").selectAll("#" + selectedIds.join(",#")));
		points.canvas = canv;
		return points;

	};

	chart.get_marked = function(){
		var elements = {};
		for(var layerId in chart.layers)
			elements[layerId] = chart.get_layer(layerId).get_marked();
		return elements;
	};


	var inherited_mark = chart.mark;
	chart.mark = function(marked) {
		if(Array.isArray(marked)) {
			inherited_mark(marked);
			return;
		}
		if(marked.empty && (!marked.canvas || Object.keys(marked.canvas) == 0)) {
			inherited_mark(marked);
			return;
		}

		if(marked == "__clear__"){
			for(var layerId in chart.layers)
				chart.get_layer(layerId).mark(marked);
			return;
		}
		
		if(marked.canvas)
			marked = marked.canvas;
		for(var layerId in marked)
			chart.get_layer(layerId).mark(marked[layerId]);
	};

	var inherited_update = chart.update;
	chart.update = function() {
		var ids = chart.layerIds();
		for(var i = 0; i < ids.length; i++){
			if(typeof chart.layers[ids[i]] === "undefined")
				chart.add_layer(ids[i]);
//			if(typeof chart.layers[ids[i]].g === "undefined")
//				chart.place_layer(ids[i]);
		}
		

		for(var k in chart.layers){
			if(ids.indexOf(k) == -1)
				chart.remove_layer(k);
			else {
				chart.get_layer(k).updateStarted = true;
				chart.get_layer(k).updateElements();
				chart.get_layer(k).updateElementStyle();
				chart.get_layer(k).updateStarted = false;
			}	
		}
		
		inherited_update();
		return chart;
	};

	var inherited_updateSize = chart.updateSize;
	chart.updateSize = function(){
		inherited_updateSize();
		for(var k in chart.layers)
			chart.get_layer(k).canvas
				.style("left", (+chart.margins().left + 3) + "px")
				.style("top", (+chart.margins().top + 3) + "px")
				.attr("width", chart.plotWidth())
				.attr("height", chart.plotHeight());
	};

	return chart;
}

var intersect = function(ar1, ar2)
{
	var ar_int = [];
	var ar = [ar1, ar2];
	var l = [ar1.length, ar2.length];
	var ind = l.indexOf(Math.min.apply(null,l));
	var ind_large = ind == 0 ? 1:0;
	for(var i = 0; i < ar[ind].length; i++)
	{
		if(ar[ind_large].indexOf(ar[ind][i]) != -1)
			ar_int.push(ar[ind][i]);
	}
	return ar_int
};

function Node(id, val)
{
  this.id = id;
  this.val = val;
  this.left = null;
  this.right = null;
  //this.left_height = null;
  //this.right_height = null;
  this.parent = null;
  this.height = 0;
  this.x = null;
  this.val_inds = [id];

  
}
     
function dendogram(heatmap)
{
	var dendogram = base()
		.add_property("orientation", "horizontal")
		.add_property("height", 300)
		.add_property("width", 500)
		.add_property("nelements") //nlabels
		.add_property("elementIds", function(){return undefined}) //labIds
		.add_property("margins", {left: 20, top: 20, bottom: 20, right: 20}) //padding
		.add_property("distance", function(a, b){
			return lc.getEuclideanDistance(a, b);			
		})
		.add_property("data")
		.add_property("lineColours", ['black', 'red'])
		.add_property("on_click", function() {});


	//if number of elements is set, define their IDs
	dendogram.wrapSetter("nelements", function(oldSetter){
		return function() {
			dendogram.get_elementIds = function(){
				return d3.range(oldSetter());
			};
			return oldSetter.apply(dendogram, arguments);
		}
	});
	//if element IDs are set, define their number
	dendogram.wrapSetter("elementIds", function(oldSetter){
		return function() {
			dendogram.get_nelements = function(){
				return oldSetter().length;
			};
			return oldSetter.apply(dendogram, arguments);
		}
	});

	dendogram.heatmap = heatmap;
	dendogram.clusters = undefined;
		
	var n_count = 0;		 
	var set_x = function(node)
	{ 
		if(node.right == null && node.left == null)
		{
			node.x = n_count;
			n_count++;
			return;
		}
		if(node.left.x == null)
			set_x(node.left);
		if(node.right.x == null)
			set_x(node.right);
		node.x = (node.right.x + node.left.x)/2 ;
		return;
	};
	var set_scale = function()
	{
		var t = -1;
		var rev_height = 0;
		var padding = dendogram.margins();
		var n_leaves = dendogram.elementIds().length;
		var box_width = (dendogram.width() - padding.right - padding.left)/n_leaves;
		var xScale = d3.scaleLinear()
					   .domain([0, n_leaves-1])
					   .range([padding.left + box_width/2, 
					   	dendogram.width() - padding.right - box_width/2]);
		if(dendogram.get_orientation() == 'vertical')
		{	rev_height = dendogram.height(); t = 1;}

		var yScale = d3.scaleLinear()			   
						.domain([0, dendogram.clusters.height])
						.range([dendogram.height() + padding.top * t - rev_height,
						 rev_height - padding.bottom * t]);
		return [xScale, yScale];
	};
	var draw_dendo = function(node, g, scales)
	{
		//var height = svg.style()[0][0].getAttribute("height");
		if(node.right != null && node.left != null)
		{
			g.append("line")
			.attr("x1", scales[0](node.left.x))
			.attr("x2", scales[0](node.right.x))
			.attr("y1", scales[1](node.height))
			.attr("y2", scales[1](node.height))
			.attr("stroke-width", 3)
			.attr("id", node.id)	
			.attr("orient", "h")
			.attr("stroke", dendogram.lineColours()[0]);

			var children = [node.left, node.right];
			for(var i = 0; i < children.length; i++)
			{
				g.append("line")
				.attr("x1", scales[0](children[i].x))
				.attr("x2", scales[0](children[i].x))
				.attr("y1",  scales[1](node.height))
				.attr("y2", scales[1](children[i].height))
				.attr("stroke-width", 3)				
				.attr("id", children[i].id)
				.attr("orient", "v")
				.attr("stroke", dendogram.lineColours()[0]);
			}
			
			draw_dendo(node.left, g, scales);
			draw_dendo(node.right, g, scales);

			return;
		}

		if(node.right != null || node.left != null){
			var child = node.right || node.left;
			g.append("line")
				.attr("x1", scales[0](node.x))
				.attr("x2", scales[0](node.x))
				.attr("y1", scales[1](node.height))
				.attr("y2", scales[1](child.height))
				.attr("stroke-width", 3)
				.attr("id", child.id)
				.attr("orient", "v")
				.attr("stroke", dendogram.lineColours()[0]);

			draw_dendo(child, g, scales);
		}

		return;
	};
	var find_node = function(node, id)
	{	
		if(node != null)
		{
			if(node.id == id)
				return node;
			else 
				return find_node(node.left,id) || find_node(node.right, id);
		}
		return null;
	};
	var add_ids = function(node, inds)
	{
		inds.push(node.id);
		if(node.left != null)
			add_ids(node.left, inds);
		if(node.right != null)
			add_ids(node.right, inds);
	};

	var check_ele = function(ele, ind_arr)
	{
		for(var i = 0; i < ind_arr.length; i++)
		{
			if(ind_arr[i] == ele)
				return true;
		}
		return false;
	};

	var set_color = function(g, inds, cla, prop)
	{
		g.selectAll('line').attr("stroke", function(d)
		{
			return check_ele(this.id, inds) ? cla[1]:cla[0];
		});
	};

	//???
	var change_prop = function(root_node, id_and_type, g, cla)
	{
		//console.log(root_node);
		var node_req = find_node(root_node, id_and_type[0]),
			inds = [],
			prop = -1;
		
		add_ids(node_req, inds);
		
		if(id_and_type[1] == 'h')
			prop = id_and_type[0];

		if(dendogram.heatmap != undefined)
		{
			if(dendogram.orientation() == 'horizontal')
			{
				var inds_int = intersect(inds,
					dendogram.heatmap.colIds());
				dendogram.heatmap.cluster('Row', inds_int);
				//TO DO: check if dendogram already exists
				dendogram.heatmap.drawDendogram("Row");
			}
			if(dendogram.orientation() == 'vertical')
			{
				var inds_int = intersect(inds,
					dendogram.heatmap.rowIds());
				dendogram.heatmap.cluster('Col', inds_int);
				dendogram.heatmap.drawDendogram("Col");
			}
			dendogram.heatmap.updateLabelPosition();
		} else {
			dendogram.get_on_click(intersect(inds, dendogram.elementIds()));
		}

		set_color(g, inds, cla, prop);		
	};

	var set_click = function(root, g, cla)
	{
		g.selectAll('line').on('click', function(d){
		change_prop(root, [this.getAttribute('id'), this.getAttribute('orient')], g, cla);});
		return dendogram;
	};

	dendogram.cluster = function(){
		dendogram.get_data("clear");
		var keys = dendogram.elementIds();
		dendogram.bucket = [];

		var elementIds = dendogram.elementIds(); 

		//Initialisation
		for(var i = 0; i < keys.length; i++)
			dendogram.bucket[i]  = new Node(keys[i], dendogram.get_data(keys[i]));	
		var bucket_dist = function(el1_inds, el2_inds)
		{
			var max_dist = dist_mat[elementIds.indexOf(el1_inds[0])][elementIds.indexOf(el2_inds[0])], dis;
			//var max_dist = dendogram.get_distance(dendogram.get_data(el1_inds[0]), dendogram.get_data(el2_inds[0]));
			for(var i = 0; i < el1_inds.length; i++)
			{
				for(var j = 0; j < el2_inds.length; j++)	
					{
						dis = dist_mat[elementIds.indexOf(el1_inds[i])][elementIds.indexOf(el2_inds[j])];
						//dis = dendogram.get_distance(dendogram.get_data(el1_inds[i]), dendogram.get_data(el2_inds[j]));
						if(dis > max_dist)
							max_dist = dis;
					}
			}
			return max_dist;
		};
		
		var merge = function()
		{
			var bucket_copy = JSON.parse(JSON.stringify(dendogram.bucket));
			while(bucket_copy.length >  1)
			{
				var to_clus = [bucket_copy[0], bucket_copy[1]];
				var min_dis = bucket_dist(bucket_copy[0].val_inds, bucket_copy[1].val_inds);	
				var to_rem = [0,1];
				for(var i = 0; i < bucket_copy.length; i++)
				{
					for(var j = i+1;  j < bucket_copy.length; j++)
					{
						 var dis = bucket_dist(bucket_copy[i].val_inds, bucket_copy[j].val_inds);
						 if(dis < min_dis)
						 {
						 	min_dis = dis;
						 	to_clus = [bucket_copy[i], bucket_copy[j]];
						 	to_rem = [i,j];
						 }
					}
				}
				//console.log(min_dis);
				var new_node = new Node(to_clus[0].id + "_" + to_clus[1].id, null);
				new_node.left = to_clus[0];
				new_node.right = to_clus[1];
				new_node.height = min_dis;
				new_node.val_inds = new_node.left.val_inds.concat(new_node.right.val_inds);
				to_rem.sort(function(a,b){return b-a});
				bucket_copy.splice(to_rem[0],1);
				bucket_copy.splice(to_rem[1],1);
				bucket_copy.push(new_node);
				
				//break;
			}
			return bucket_copy[0];
		};
		var dist_mat = calc_dist();
		//console.log(dist_mat[0])
		dendogram.clusters = merge();
	};

	var calc_dist = function(){
		var keys = dendogram.elementIds();
		var dist = new Array(keys.length);
		for(var i = 0; i < keys.length; i++)
			dist[i] = new Array(keys.length);
		for(var i = 0; i < keys.length; i++)
		{
			for(var j = i; j < keys.length; j++)
			{
				var d = dendogram.get_distance(dendogram.get_data(keys[i]), dendogram.get_data(keys[j]));
				dist[i][j] = d;
				dist[j][i] = d;
			}
		}
		return dist;
	};

	dendogram.draw = function()
	{
		set_x(dendogram.clusters);
		n_count = 0;
		
		d3.selectAll(dendogram.g.node().childNodes).remove();

		if(dendogram.orientation() == "vertical"){
			if(dendogram.heatmap){
				dendogram.width(dendogram.heatmap.height())
					.height(dendogram.heatmap.margins().left)
					.margins({
						left: dendogram.heatmap.margins().top,
						top: 0,
						bottom: 0,
						right: dendogram.heatmap.margins().bottom
					});
				dendogram.svg.select(".row")
					.attr("transform", "translate(" + 
														(dendogram.heatmap.margins().left + +dendogram.heatmap.plotWidth() + 5) + 
														", " + dendogram.heatmap.margins().top + ")")
					.selectAll("text")
						.style("text-anchor", "start");
			}
			else
				dendogram.svg
					.attr("width", dendogram.width())
					.attr("height", dendogram.height());
			dendogram.g
				.attr("transform", "rotate(90) translate(0, -" + dendogram.height() + ")");
		} else {
			if(dendogram.heatmap) {
				dendogram.width(dendogram.heatmap.width())
					.height(dendogram.heatmap.margins().top)
					.margins({
						top: 0,
						left: dendogram.heatmap.margins().left,
						right: dendogram.heatmap.margins().right,
						bottom: 0
					});

				dendogram.svg.select(".col")
					.attr("transform", "translate(" + 
														 + dendogram.margins().left + 
														", " + (dendogram.heatmap.margins().top + +dendogram.heatmap.plotHeight() + 5) + ")")
					.selectAll("text")
						.style("text-anchor", "end");
				}
			else
				dendogram.svg
					.attr("width", dendogram.width())
					.attr("height", dendogram.height());
//			dendogram.g
//				.attr("transform", "translate(" + dendogram.margins().left + 
//																	", " + dendogram.margins().right + ")");
		}

		var newTree = trimNodes();
		if(newTree === undefined)
			return;
		dendogram.scales = set_scale();
		draw_dendo(newTree, dendogram.g, dendogram.scales );
		set_click(newTree, dendogram.g, dendogram.lineColours());		
		return dendogram;
	};

	var trimNodes = function(){
		var elementIds = dendogram.elementIds(),
			newTree = {
				id: dendogram.clusters.id,
				left: null,
				right: null,
				val_inds: dendogram.clusters.val_inds,
				x: dendogram.clusters.x,
				val: dendogram.clusters.val,
				original: dendogram.clusters,
				height: dendogram.clusters.height,
				parent: null
			};
		
		var copyId = function(node, id){
			if(node.height == 0)
				return;
			if(node.left && node.left.val_inds.indexOf(id) != -1){
				copyId(node.left, id);
				return;
			}
			if(node.right && node.right.val_inds.indexOf(id) != -1){
				copyId(node.right, id);
				return;
			}
			if(node.original.left.val_inds.indexOf(id) != -1){
				node.left = {
					id: node.original.left.id,
					left: null,
					right: null,
					val_inds: node.original.left.val_inds,
					x: node.original.left.x,
					val: node.original.left.val,
					original: node.original.left,
					height: node.original.left.height,
					parent: node
				};
				copyId(node.left, id);
				return;
			}
			node.right = {
				id: node.original.right.id,
				left: null,
				right: null,
				val_inds: node.original.right.val_inds,
				x: node.original.right.x,
				val: node.original.right.val,
				original: node.original.right,
				height: node.original.right.height,
				parent: node				
			};
			copyId(node.right, id);
		};
		
		for(var i = 0; i < elementIds.length; i++){
			if(dendogram.clusters.val_inds.indexOf(elementIds[i]) == -1){
				if(dendogram.heatmap){
					dendogram.remove();
					return undefined;
				}
				dendogram.cluster();
				set_x(dendogram.clusters);
				return dendogram.clusters;
			}
			copyId(newTree, elementIds[i]);
		}
		var currentPosition = 0;
		var cutBranches = function(node) {
			if(node === null) return;
			cutBranches(node.left);
			cutBranches(node.right);
			if(node.height == 0){
				node.x = currentPosition;
				currentPosition++;
				return;
			}
			if(node.left && node.right)
				node.x = (node.left.x + node.right.x)/2;
			if(node.parent == null)
				return;
			if(node.left == null){
				node.x = node.right.x;
				//node.parent.left = node.right.left;
				//node.parent.right = node.right.right;
				//node.right.parent = node.parent;
			}
			if(node.right == null){
				node.x = node.left.x;
				//node.parent.left = node.left.left;
				//node.parent.right = node.left.right;
				//node.left.parent = node.parent;
			}
		};

		cutBranches(newTree);

		var findRoot = function(node){
			if(node.left && node.right)
				return node;
			if(node.left)
				return findRoot(node.left);
			if(node.right)
				return findRoot(node.right);
		};

		return findRoot(newTree);
	};
	
	dendogram.put_static_content = function(element)
	{
		if(dendogram.heatmap){
			dendogram.g = dendogram.heatmap.svg
				.append("g")
					.attr("class", "dendogram");
			dendogram.svg = heatmap.svg;
			dendogram.container = heatmap.container;
		} else {
			dendogram.container = element.append("div")
				.style("position", "relative");
			dendogram.svg = dendogram.container
				.append("svg");
			dendogram.g = dendogram.svg
				.append("g");
		}

		return dendogram;		
	};

	dendogram.remove = function(){
		dendogram.g.remove();
		var type;
		if(dendogram.heatmap){
			var chart = dendogram.heatmap;
			dendogram.orientation() == "horizontal" ? type = "Col" : type = "Row";
			chart.showDendogram(type, false);
			chart["dendogram" + type] = undefined;
			if(chart.transitionDuration() > 0 && !chart.transitionOff){
				var t = d3.transition("remove")
					.duration(chart.transitionDuration());
				chart.svg.selectAll(".label_panel." + type.toLowerCase()).transition(t)
						.attr("transform", "translate(" + chart.margins().left + ", " +
									chart.margins().top + ")");
				if(type == "Row")
					chart.svg.select(".row").selectAll("text").transition(t)
						.style("text-anchor", "end");
				else
					chart.svg.select(".col").selectAll("text").transition(t)
						.style("text-anchor", "start");
			}
			else{ 			
				chart.svg.selectAll(".label_panel." + type.toLowerCase())
						.attr("transform", "translate(" + chart.margins().left + ", " +
									chart.margins().top + ")");
				if(type == "Row")
					chart.svg.select(".row").selectAll("text")
						.style("text-anchor", "end");
				else	
					chart.svg.select(".col").selectAll("text")
						.style("text-anchor", "start");
			}
		}
	};	
	
  dendogram.update = function(){
  	dendogram.cluster();
  	dendogram.draw();

  	return dendogram;
  };

  dendogram.place = function( element ) {

    if( element === undefined )
      element = "body";
    if( typeof( element ) == "string" ) {
      var node = element;
      element = d3.select( node );
      if( element.size() == 0 )
        throw "Error in function 'place': DOM selection for string '" +
          node + "' did not find a node."
  	}

		dendogram.put_static_content( element );
    
    if(dendogram.heatmap === undefined)
    	dendogram.update(); 

    return dendogram;
  };

	return dendogram;
}

function heatmap(id, chart){

	var chart = chartBase()
		.add_property("nrows", undefined, check("number_nonneg", "nrows"))
		.add_property("ncols", undefined, check("number_nonneg", "ncols"))
		.add_property("colLabel", function(i) {return i;}, check("array_fun", "colLabel"))
		.add_property("rowLabel", function(i) {return i;}, check("array_fun", "rowLabel"))
		.add_property("colIds", undefined, check("array", "colIds"))
		.add_property("rowIds", undefined, check("array", "rowIds"))
		.add_property("dispColIds", function() {return chart.colIds();}, check("array", "dispColIds"))
		.add_property("dispRowIds", function() {return chart.rowIds();}, check("array", "dispRowIds"))
		.add_property("heatmapRow", function(rowId) {return chart.dispRowIds().indexOf(rowId);}, check("array_fun", "heatmapRow"))
		.add_property("heatmapCol", function(colId) {return chart.dispColIds().indexOf(colId);}, check("array_fun", "heatmapCol"))
		.add_property("showDendogramRow", true)
		.add_property("showDendogramCol", true)
		.add_property("value", undefined, check("matrix_fun", "value"))
		.add_property("mode", "default")
		.add_property("colour")
		.add_property("palette", d3.interpolateOrRd, function(value) {
			if(typeof value === "string") {
				if(!d3[value])
		      throw "Error in 'typeCheck' for 'palette': invalid palette name, " +
		               "must be one of d3 interpolators (e.g. 'interpolateOrRd').";
		    return d3[value];
			}
			if(Array.isArray(value))
				return d3.scaleLinear()
									.domain(d3.range(value.length).map(function(el) {return el/value.length}))
									.range(value);
			if(typeof value === "function")
				return value

      throw "Error in 'typeCheck' for 'palette': invalid type. Palette must be " +
             "a name of a d3 interpolator, an array of colours or a function.";
		})
		.add_property("colourDomain", function() {return chart.dataRange()}, check("array", "colourDomain"))
		.add_property("clusterRowMetric", getEuclideanDistance)
		.add_property("clusterColMetric", getEuclideanDistance)
		.add_property("on_click", function() {})
		.add_property("rowTitle", "")
		.add_property("showValue", false)
		.add_property("colTitle", "")
		.add_property("on_mouseover")
		.add_property("on_mouseout")
		.add_property("clusterRows", false)
		.add_property("clusterCols", false)
		.add_property("informText", function(rowId, colId) {
			var value = chart.get_value(rowId, colId);
			if(typeof value == "number")
				value = value.toFixed(2);

			return "Row: <b>" + chart.get_rowLabel(rowId) + "</b>;<br>" + 
						"Col: <b>" + chart.get_colLabel(colId) + "</b>;<br>" + 
						"value = " + value;
			});

	chart.margins({top: 100, left: 100, right: 10, bottom: 40});

	//setting a number of elements or their IDs should replace
	//each other
	["col", "row"].forEach(function(name){
		//if number of elements is set, define their IDs
		chart.wrapSetter("n" + name + "s", function(oldSetter){
			return function() {
				chart["get_" + name + "Ids"] = function(){
					return d3.range(oldSetter());
				};
				return oldSetter.apply(chart, arguments);
			}
		});
		//if element IDs are set, define their number
		chart.wrapSetter(name + "Ids", function(oldSetter){
			return function() {
				chart["get_n" + name + "s"] = function(){
					return oldSetter().length;
				};
				var capitalised = name[0].toUpperCase() + name.slice(1);
				oldSetter.apply(chart, arguments);
				//if row or column IDs are changed, reset displayed IDs
				chart["get_disp" + capitalised + "Ids"] = chart["get_" + name + "Ids"];
				return chart;
			}
		});
	});

	chart.wrapSetter("colour", function(oldSetter){
		return function() {
			var res = oldSetter.apply(chart, arguments);
			var oldGetter = chart.get_colour;
			chart.get_colour = function() {
				if(arguments.length == 1 && arguments[0] === undefined)
					return "#eee";
				return oldGetter.apply(chart, arguments);
			};
			return res;
		}
	});	

	chart.colour(function(val) {return chart.colourScale(val);});

	chart.axes = {};
	chart.marked = [];

	(function() {
		var show = {Row: chart.showDendogramRow(), Col: chart.showDendogramCol()};
		chart.showDendogram = function(type, sh){
			if(sh === undefined)
				return show[type];
			show[type] = sh && chart["showDendogram" + type]();
			return chart;		
		};
	})();
	chart.showDendogram("Row", false)
		.showDendogram("Col", false);


	var inherited_put_static_content = chart.put_static_content;
	chart.put_static_content = function(element){
		inherited_put_static_content(element);
		add_click_listener(chart);
		//create main parts of the heatmap
		chart.svg.append("g")
			.attr("class", "row label_panel");
		chart.svg.append("g")
			.attr("class", "col label_panel");
		chart.canvas = chart.container.append("canvas")
			.style("position", "absolute")
			.style("z-index", -5)
			.attr("id", "hCanvas");		
		chart.g = chart.svg.select(".plotArea").append("g")
			.attr("class", "chart_g");
		chart.text = chart.g.append("g")
			.attr("class", "text_g");
		chart.axes.x_label = chart.svg.append("text")
			.attr("class", "axisLabel")
			.attr("text-anchor", "end");
		chart.axes.y_label = chart.svg.append("text")
			.attr("class", "axisLabel")
			.attr("text-anchor", "end")
			.attr("transform", "rotate(-90)");

		(get_mode() == "svg") ? chart.g.classed("active", true) : 
														chart.canvas.classed("active", true);

		chart.svg.select(".clickPanel")
			.on("mouseover", function() {
				chart.container.select(".inform").classed("hidden", false);
			})
			.on("mouseout", function() {
				chart.container.select(".inform").classed("hidden", true);
			});

		chart.legend.width(75);


		if(chart.showPanel()){
			chart.panel.add_button("Zoom in", "#zoomIn", function(chart){
				var removeRows = -Math.ceil(chart.dispRowIds().length * 0.1),
					removeCols = -Math.ceil(chart.dispColIds().length * 0.1);
				chart.dispRowIds(addLines(removeRows, "top"));
				chart.dispRowIds(addLines(removeRows, "bottom"));
				chart.dispColIds(addLines(removeCols, "left"));
				chart.dispColIds(addLines(removeCols, "right"));

				chart.updateStarted = true;
				chart.updateLabels();
				chart.updateLabelPosition();
				chart.updateStarted = false;				
			}, "Double click to return to original scales");
			chart.panel.add_button("Zoom out", "#zoomOut", function(chart){
				var addRows = Math.ceil(chart.dispRowIds().length * 0.1),
					addCols = Math.ceil(chart.dispColIds().length * 0.1);
				
				chart.dispRowIds(addLines(addRows, "top"));
				chart.dispRowIds(addLines(addRows, "bottom"));
				chart.dispColIds(addLines(addCols, "left"));
				chart.dispColIds(addLines(addCols, "right"));

				chart.updateStarted = true;
				chart.updateLabels();
				chart.updateLabelPosition();
				chart.updateCellColour();
				chart.updateLabelText();
				chart.updateStarted = false;
			}, "Double click to return to original scales");
			chart.panel.add_button("Cluster rows", "#clusterRows", function(chart){
				chart.cluster("Row");
				chart.showDendogram("Row", true);
				chart.updateLabelPosition();
			});
			chart.panel.add_button("Cluster columns", "#clusterCols", function(chart){
				chart.cluster("Col");
				chart.showDendogram("Col", true);
				chart.updateLabelPosition();
			});
			chart.panel.add_button("Restore original order", "#restoreOrder", function(chart){
				var rowIds = chart.rowIds().slice(),
					colIds = chart.colIds().slice();
				chart.reorder("Row", function(a, b) {return rowIds.indexOf(a) - rowIds.indexOf(b)});
				chart.reorder("Col", function(a, b) {return colIds.indexOf(a) - colIds.indexOf(b)});
				if(chart.dendogramRow)
					chart.dendogramRow.remove();
				if(chart.dendogramCol)
					chart.dendogramCol.remove();
				chart.updateStarted = true;
				chart.updateLabels()
					.updateLabelPosition()
					.updateLabelText()
					.updateCellColour();
				chart.updateStarted = false;
			});				
		}
	};

	var get_mode = function() {
		if(chart.mode() == "default")
			return chart.dispColIds().length * chart.dispRowIds().length > 2500 ? "canvas" : "svg";
		return chart.mode();
	};

	chart.findElements = function(lu, rb){
		var selectedIds = [];
		if(get_mode() == "svg") {
			var selectedElements = chart.g.selectAll(".data_element")
				.filter(function() {
					var loc = [this.x.baseVal.value, this.y.baseVal.value];
					return (loc[0] <= rb[0]) && (loc[1] <= rb[1]) && 
						(loc[0] + chart.cellSize.width >= lu[0]) && 
						(loc[1] + chart.cellSize.height >= lu[1]);
				});
			selectedIds = selectedElements.data();
		} else {
			var selCols = chart.svg.select(".col").selectAll(".label")
				.filter(function() {
					var loc = this.y.baseVal[0].value;
					return (loc >= lu[0] && loc <= rb[0] + chart.cellSize.width)
				}).data(),
				selRows = chart.svg.select(".row").selectAll(".label")
				.filter(function() {
					var loc = this.y.baseVal[0].value;
					return (loc >= lu[1] && loc <= rb[1] + chart.cellSize.height)
				}).data();
			for(var i = 0; i < selRows.length; i++)
				for(var j = 0; j < selCols.length; j++)
					selectedIds.push([selRows[i], selCols[j]]);
		}

		return selectedIds;
	};
	chart.get_position = function(id){
		return [chart.axes.scale_x(chart.get_heatmapCol(id[1])) + chart.cellSize.width/2,
						chart.axes.scale_y(chart.get_heatmapRow(id[0])) + chart.cellSize.height/2]
	};	
	//returns maximum and minimum values of the data
	chart.dataRange = function(){
		var i = 0, range, newRange,
			rowIds = chart.get_rowIds(),
			colIds = chart.get_colIds();
		do{
			newRange = d3.extent(colIds, 
				function(col) {return chart.get_value(rowIds[i], col);});
			if(typeof range === "undefined")
				range = newRange;
			if(newRange[0] < range[0])
				range[0] = newRange[0];
			if(newRange[1] > range[1])
				range[1] = newRange[1];
			i++;
		}while (i < chart.get_nrows())
			
		return range;
	};

	//set default hovering behaviour
	function on_mouseoverLabel() {
		d3.select(this).classed("hover", true);
	}
	function on_mouseoutLabel() {
		d3.select(this).classed("hover", false);
	}

	chart.reorder = function(type, f){
		if(f == "flip"){
			chart["get_heatmap" + type]("__flip__");
			chart.updateLabelPosition();
			return chart;
		}
		f.domain = chart["disp"+ type + "Ids"]().slice();
		var orderedIds = chart["get_heatmap" + type]("__order__");
		if(orderedIds == -1)
			orderedIds = chart[type.toLowerCase() + "Ids"]().slice();

		var savedOrder = orderedIds.slice();
		var newF = function(a, b){
			if(f.domain.indexOf(a) != -1 && f.domain.indexOf(b) != -1)
				return f(a, b);
			if(savedOrder.indexOf(a) != -1 && savedOrder.indexOf(b) != -1)
				return savedOrder.indexOf(a) - savedOrder.indexOf(b);
			return chart[type.toLowerCase() + "Ids"]().indexOf(a) -
							chart[type.toLowerCase() + "Ids"]().indexOf(b);
		};

		var dispIds = chart["disp" + type + "Ids"]().slice().sort(f);
		orderedIds.sort(newF);
		var mult = 1;

		chart["heatmap" + type](function(id){
			if(id == "__flip__"){
				mult *= -1;
				//dispIds.reverse();
				orderedIds.reverse();
				return;
			}
			if(id == "__order__")
				return orderedIds;
			if(id == "__sort__"){
				dispIds = chart["disp" + type + "Ids"]().slice().sort(function(a, b){return mult * newF(a, b);});
				return;
			}

			return dispIds.indexOf(id);
		});

		if(chart.svg){
			var invType;
			type == "Row" ? invType = "col" : invType = "row";
			chart.svg.select("." + invType).selectAll(".sorted")
				.classed("selected", false)
				.classed("sorted", false);		
		}
		return chart;
	};

	function addLines(k, side) {
		var orderedIds, dispIds;
		if(side == "top" || side == "bottom"){
			orderedIds = chart.get_heatmapRow("__order__");
			if(orderedIds == -1)
				orderedIds = chart.rowIds();
			dispIds = chart.dispRowIds();
		}
		if(side == "left" || side == "right"){
			orderedIds = chart.get_heatmapCol("__order__");
			if(orderedIds == -1)
				orderedIds = chart.colIds();
			dispIds = chart.dispColIds();
		}
		if(k == 0) return dispIds;
		if(k < 0){
			k = -k;
			var pos, ind;
			if(side == "top" || side == "left"){
				pos = 0;
				while(k > 0 && dispIds.length > 1){
					ind = dispIds.indexOf(orderedIds[pos]);
					if(ind != -1){
						k--;
						dispIds.splice(ind, 1);
					}
					pos++;
				}
				return dispIds;
			}
			else{
				pos = orderedIds.length - 1;
				while(k > 0 && dispIds.length > 1){
					ind = dispIds.indexOf(orderedIds[pos]);
					if(ind != -1){
						k--;
						dispIds.splice(ind, 1);
					}
					pos--;
				}
				return dispIds;
			}
		}

		var border;
		if(side == "top" || side == "left"){
			border = orderedIds.length;
			for(var i = 0; i < dispIds.length; i++)
				if(border > orderedIds.indexOf(dispIds[i]))
					border = orderedIds.indexOf(dispIds[i]);
			for(var i = border - 1; i >= d3.max([0, border - k]); i--)
				dispIds.unshift(orderedIds[i]);
		} else { 
			border = -1;
			for(var i = 0; i < dispIds.length; i++)
				if(border < orderedIds.indexOf(dispIds[i]))
					border = orderedIds.indexOf(dispIds[i]);
				for(var i = border + 1; i < d3.min([orderedIds.length, border + k + 1]); i++)
					dispIds.push(orderedIds[i]);
		}
		return dispIds;
	}
	
	var inherited_updateSize = chart.updateSize;
	chart.updateSize = function(){
		inherited_updateSize();
		if(chart.transitionDuration() > 0 && !chart.transitionOff){
			var t = d3.transition("size").duration(chart.transitionDuration());
			if(!chart.showDendogram("Row"))
				chart.svg.selectAll(".label_panel.row").transition(t)
					.attr("transform", "translate(" + chart.margins().left + ", " +
						chart.margins().top + ")");
			if(!chart.showDendogram("Col"))
				chart.svg.selectAll(".label_panel.col").transition(t)
					.attr("transform", "translate(" + chart.margins().left + ", " +
						chart.margins().top + ")");

			chart.axes.x_label.transition(t)
				.attr("font-size", d3.min([chart.margins().bottom - 2, 15]))
				.attr("x", chart.plotWidth() + chart.margins().left)
				.attr("y", chart.height());
			chart.axes.y_label.transition(t)
				.attr("font-size", d3.min([chart.margins().right - 2, 15]))
				.attr("x", - chart.margins().top)
				.attr("y", chart.width());
		} else {
			if(!chart.showDendogram("Row"))
				chart.svg.selectAll(".label_panel.row")
					.attr("transform", "translate(" + chart.margins().left + ", " +
						chart.margins().top + ")");
			if(!chart.showDendogram("Col"))
				chart.svg.selectAll(".label_panel.col")
					.attr("transform", "translate(" + chart.margins().left + ", " +
						chart.margins().top + ")");

			chart.axes.x_label
				.attr("font-size", d3.min([chart.margins().bottom - 2, 15]))
				.attr("x", chart.get_plotWidth() + chart.margins().left)
				.attr("y", chart.get_height());
			chart.axes.y_label
				.attr("font-size", d3.min([chart.margins().right - 2, 15]))
				.attr("x", - chart.margins().top)
				.attr("y", chart.width());
		}

		chart.canvas
			.style("left", (+chart.margins().left + 3) + "px")
			.style("top", (+chart.margins().top + 3) + "px")
			.attr("width", chart.plotWidth())
			.attr("height", chart.plotHeight());		

		chart.updateLabelPosition();
		return chart;
	};

	chart.updateLabelPosition = function(){
		var ncols = chart.dispColIds().length,
			nrows = chart.dispRowIds().length;
		chart.get_heatmapRow("__sort__");
		chart.get_heatmapCol("__sort__");
		//calculate cell size
		chart.cellSize = {
			width: chart.plotWidth() / ncols,
			height: chart.plotHeight() / nrows
		};
		//create scales
		chart.axes.scale_x = d3.scaleLinear()
			.domain( [0, ncols - 1] )
			.range( [0, chart.plotWidth() - chart.cellSize.width] );
		chart.axes.scale_y = d3.scaleLinear()
			.domain( [0, nrows - 1] )
			.range( [0, chart.plotHeight() - chart.cellSize.height] );

		if(chart.transitionDuration() > 0 && !chart.transitionOff){
			var t = d3.transition("labelPosition").duration(chart.transitionDuration());
			chart.svg.select(".col").selectAll(".label").transition(t)
				.attr("font-size", d3.min([chart.cellSize.width, 12]))
				.attr("y", function(d) {return chart.axes.scale_x(chart.get_heatmapCol(d) + 1);});
			chart.svg.select(".row").selectAll(".label").transition(t)
				.attr("font-size", d3.min([chart.cellSize.height, 12]))
				.attr("y", function(d) {return chart.axes.scale_y(chart.get_heatmapRow(d) + 1);});
		
		} else {
			chart.svg.select(".col").selectAll(".label")
				.attr("font-size", d3.min([chart.cellSize.width, 12]))
				.attr("y", function(d) {return chart.axes.scale_x(chart.get_heatmapCol(d) + 1);});
			chart.svg.select(".row").selectAll(".label")
				.attr("font-size", d3.min([chart.cellSize.height, 12]))
				.attr("y", function(d) {return chart.axes.scale_y(chart.get_heatmapRow(d) + 1);});
		}
		chart.updateCellPosition();
		
		if(chart.showDendogram("Col"))
			chart.drawDendogram("Col");
		if(chart.showDendogram("Row"))
			chart.drawDendogram("Row");
		
		return chart;
	};

	chart.updateLabels = function(){
		//add column labels
		var colLabel = chart.svg.select(".col").selectAll(".label")
				.data(chart.get_dispColIds(), function(d) {return d;});
		colLabel.exit()
			.remove();
		//add row labels
		var rowLabel = chart.svg.select(".row").selectAll(".label")
				.data(chart.get_dispRowIds(), function(d) {return d;});
		rowLabel.exit()
			.remove();
		colLabel.enter()
			.append("text")
				.attr("class", "label plainText")
				.attr("transform", "rotate(-90)")
				.style("text-anchor", "start")
				.attr("dx", 2)
				.merge(colLabel)
					.attr("id", function(d) {return d.toString().replace(/[ .]/g,"_")})
					.on("mouseover", on_mouseoverLabel)
					.on("mouseout", on_mouseoutLabel)
					.on("click", labelClick);
		rowLabel.enter()
			.append("text")
				.attr("class", "label plainText")
				.style("text-anchor", "end")
				.attr("dx", -2)
				.merge(rowLabel)
					.attr("id", function(d) {return d.toString().replace(/[ .]/g,"_")})
					.on("mouseover", on_mouseoverLabel)
					.on("mouseout", on_mouseoutLabel)
					.on("click", labelClick);

		chart.updateCells();
		return chart;
	};

	chart.updateLabelText = function(){
		if(chart.transitionDuration() > 0 && !chart.transitionOff){
			var t = d3.transition("labelText").duration(chart.transitionDuration());
			chart.svg.select(".col").selectAll(".label").transition(t)
				.text(function(d) {return chart.get_colLabel(d);});
			chart.svg.select(".row").selectAll(".label").transition(t)
				.text(function(d) {return chart.get_rowLabel(d)});		
		} else {
			chart.svg.select(".col").selectAll(".label")
				.text(function(d) {return chart.get_colLabel(d);});
			chart.svg.select(".row").selectAll(".label")
				.text(function(d) {return chart.get_rowLabel(d)});
		}
		return chart;		
	};

	chart.zoom = function(lu, rb){
		var selectedCells = chart.findElements(lu, rb);
		if(selectedCells.length < 2)
			return;
		var rowIdsAll = [], colIdsAll = [];
		selectedCells.map(function(e){
			rowIdsAll.push(e[0]);
			colIdsAll.push(e[1]);
		});
		var rowIds = [], colIds = [];

		for(var i = 0; i < rowIdsAll.length; i++)
			if(rowIds.indexOf(rowIdsAll[i]) == -1)
				rowIds.push(rowIdsAll[i]);
		for(var i = 0; i < colIdsAll.length; i++)
			if(colIds.indexOf(colIdsAll[i]) == -1)
				colIds.push(colIdsAll[i]);
		if(rowIds.length > 0 )
		chart.dispRowIds(rowIds);
		chart.dispColIds(colIds);
		//chart.clusterRowIds(rowIds)
		//chart.clusterColIds(colIds)
		chart.updateLabels();
		chart.updateLabelPosition();
		//chart.cluster('Row')
		//	 .cluster('Col');
		//if(chart.dendogramRow) chart.drawDendogram("Row");
		//if(chart.dendogramCol) chart.drawDendogram("Col");
		return chart;
	};

	chart.resetDomain = function(){
		chart.dispColIds(chart.colIds());
		chart.dispRowIds(chart.rowIds());
		chart.updateStarted = true;
		chart.updateLabels()
			.updateLabelPosition()
			.updateCellColour()
			.updateLabelText();
		chart.updateStarted = false;
		return chart;
	};

	chart.resetColourScale = function(){
	//create colorScale
		var range = chart.colourDomain();
		if(range.length == 2 && typeof (range[0] + range[1]) == "number")
			chart.colourScale = d3.scaleSequential(chart.get_palette).domain(range);
		else {
			chart.colourScale = d3.scaleOrdinal()
				.domain(range);
			if(chart.get_palette().splice)
				chart.colourScale.range(chart.get_palette());
			else
				chart.colourScale.range(d3.schemeSet1);
		}

		if(chart.showLegend() && chart.legend)
			updateLegend();		
	};	

	//some default onmouseover and onmouseout behaviour for cells and labels
	//may be later moved out of the main library
	function on_mouseover(d) {
		var pos = d3.mouse(chart.container.node());
		//change colour and class
		d3.select(this)
			.attr("fill", function(d) {
				return d3.rgb(chart.get_colour(chart.get_value(d[0], d[1]))).darker(0.5);
			})
			.classed("hover", true);		
		//find column and row labels
		chart.svg.select(".col").selectAll(".label")
			.filter(function(dl) {return dl == d[1];})
				.classed("hover", true);
		chart.svg.select(".row").selectAll(".label")
			.filter(function(dl) {return dl == d[0];})
				.classed("hover", true);
		//show label
		if(chart.get_showValue()){
			chart.g.selectAll(".tval").filter(function(fd){
				return fd[0] == d[0] && fd[1] == d[1];
			})
			.classed("hidden", false);
		} else {
		chart.container.select(".inform")
			.style("left", (pos[0] + 10) + "px")
			.style("top", (pos[1] + 10) + "px")
			.select(".value")
				.html(function() {return chart.get_informText(d[0], d[1])});  
		chart.container.select(".inform")
			.classed("hidden", false);
		}
		chart.get_on_mouseover(d[0], d[1]);
	}
	function on_mouseout(d) {
		//change colour and class
		d3.select(this)
			.attr("fill", function(d) {
				return chart.get_colour(chart.get_value(d[0], d[1]));
			})
			.classed("hover", false);
		//deselect row and column labels
		chart.svg.selectAll(".label")
			.classed("hover", false);
		if(chart.get_showValue()){
			chart.g.selectAll(".tval").classed("hidden", true);
		} else {
			chart.container.select(".inform")
				.classed("hidden", true);
		}
		chart.get_on_mouseout(d[0], d[1]);		
	}
	
	//set default clicking behaviour for labels (ordering)
	function labelClick(d){
		//check whether row or col label has been clicked
		var type;
		d3.select(this.parentNode).classed("row") ? type = "row" : type = "col";
		//if this label is already selected, flip the heatmap
		if(d3.select(this).classed("sorted")){
			type == "col" ? chart.reorder("Row", "flip") : chart.reorder("Col", "flip");
		} else {
			//select new label and chage ordering
			if(type == "col"){
				chart.reorder("Row", function(a, b){
					return chart.get_value(b, d) - chart.get_value(a, d);
				});
				if(chart.dendogramRow)
					chart.dendogramRow.remove();
			} else {
				chart.reorder("Col", function(a, b){
					return chart.get_value(d, b) - chart.get_value(d, a);
				});
				if(chart.dendogramCol)
					chart.dendogramCol.remove();
			}
			chart.updateLabelPosition();
		}
		
		d3.select(this).classed("sorted", true)
			.classed("selected", true);
	}
	
	var isSorted = function(label) {
		var id = d3.select(label).datum(),
			sorted = true, i = 1, dataIds;

		if(d3.select(label.parentNode).classed("row")){
			dataIds = chart.dispColIds();
			while(sorted && i < dataIds.length) {
				if(chart.get_value(id, dataIds[i]) > chart.get_value(id, dataIds[i - 1]))
					sorted = false;
				i++;
			}
			if(sorted) return sorted;
			i = 1;
			sorted = true;
			while(sorted && i < dataIds.length) {
				if(chart.get_value(id, dataIds[i]) < chart.get_value(id, dataIds[i - 1]))
					sorted = false;
				i++;
			}
			return sorted;

		} else {
			dataIds = chart.dispRowIds();
			while(sorted && i < dataIds.length) {
				if(chart.get_value(dataIds[i], id) > chart.get_value(dataIds[i - 1], id))
					sorted = false;
				i++;
			}
			if(sorted) return sorted;
			i = 1;
			sorted = true;
			while(sorted && i < dataIds.length) {
				if(chart.get_value(dataIds[i], id) < chart.get_value(dataIds[i - 1], id))
					sorted = false;
				i++;
			}
			return sorted;
		}
	};

	chart.updateCellColour = function() {
		if(!checkMode())
			return chart;

		if(get_mode() == "svg") {
			if(chart.transitionDuration() > 0 && !chart.transitionOff)
				chart.g.selectAll(".data_element").transition("cellColour").duration(chart.transitionDuration())
					.attr("fill", function(d) {
						return chart.get_colour(chart.get_value(d[0], d[1]));
				});
			else
				chart.g.selectAll(".data_element")
					.attr("fill", function(d) {
						return chart.get_colour(chart.get_value(d[0], d[1]));
				});
			chart.svg.selectAll(".sorted")
				.classed("selected", false)
				.classed("sorted", false);

			if(chart.get_showValue())
				chart.updateTextValues();
		} else {
			if(!chart.updateStarted)
				chart.updateCanvas();
		}

		chart.svg.selectAll(".sorted").filter(function(d){
			return !isSorted(this);
		})
			.classed("sorted", false)
			.classed("selected", false);
		
		return chart;
	};

	chart.updateCells = function(){
		if(!checkMode())
			return chart;

		var markedCells = chart.get_marked().length;

		if(get_mode() == "svg") {
			//add rows
			var rows = chart.g.selectAll(".data_row")
				.data(chart.get_dispRowIds(), function(d) {return d;});
			rows.exit()
				.remove();
			rows.enter()
				.append("g")
					.attr("class", "data_row");

			//add cells	
			var cells = chart.g.selectAll(".data_row").selectAll(".data_element")
				.data(function(d) {
					return chart.get_dispColIds().map(function(e){
						return [d, e];
					})
				}, function(d) {return d;});
			cells.exit()
				.remove();
			cells.enter()
				.append("rect")
					.attr("class", "data_element")
					.attr("opacity", 0.5)
					.merge(cells)
						.attr("id", function(d) {return "p" + (d[0] + "_-sep-_" + d[1]).replace(/[ .]/g,"_")})
						.attr("rowId", function(d) {return d[0];})
						.attr("colId", function(d) {return d[1];})
						.on("mouseover", on_mouseover)
						.on("mouseout", on_mouseout)
						.on("click", function(d) {
							chart.get_on_click.apply(this, [d[0], d[1]]);
						});
			if(chart.get_showValue())
				chart.updateTexts();
		} else {
			var dispRowIds = chart.dispRowIds(),
				dispColIds = chart.dispColIds(),
				i = 0;

			while(i < chart.marked.length)
				if(dispRowIds.indexOf(chart.marked[i][0]) == -1 || dispColIds.indexOf(chart.marked[i][1]) == -1)
					chart.marked.splice(i, 1);
				else
					i++;

			if(!chart.updateStarted)
				chart.updateCanvas();
		}

		var newMarked = chart.get_marked().length;

		if(markedCells > newMarked)
			chart.on_marked();
		if(newMarked == 0)
			chart.g.selectAll(".data_element")
				.attr("opacity", 1);

		
		return chart;
	};

	chart.updateCellPosition = function(){
		if(!checkMode())
			return chart;

		if(get_mode() == "svg"){
			if(chart.transitionDuration() > 0 && !chart.transitionOff)
				chart.g.selectAll(".data_element").transition("cellPosition")
					.duration(chart.transitionDuration())
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("width", chart.cellSize.width)
					.attr("height", chart.cellSize.height)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0]))
					});
			else
				chart.g.selectAll(".data_element")
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("width", chart.cellSize.width)
					.attr("height", chart.cellSize.height)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0]))
					});
			if(chart.get_showValue())
				chart.updateTextPosition();
		} else {
			chart.updateCanvas();
		}

		return chart;
	};

	chart.cluster = function(type, features){
		console.log(type);
		if(type != "Row" && type != "Col")
			throw "Error in 'cluster': type " + type + " cannot be recognised. " +
					"Please, use either 'Row' or 'Col'";
		
		chart.showDendogram(type, true);

		if(chart["dendogram" + type] === undefined){
			chart["dendogram" + type] = dendogram(chart);
			type == "Row" ? chart["dendogram" + type].orientation("vertical") : 
											chart["dendogram" + type].orientation("horizontal"); 
		}

		chart["dendogram" + type]
			.elementIds(function() {
				return chart["disp" + type + "Ids"]();
			});
		if(features === undefined)
			type == "Row" ? features = chart.dispColIds() :
											features = chart.dispRowIds();
		//console.log(features);

		if(type == "Row")
			chart["dendogram" + type]
				.data(cache(function(id) {
					return features.map(function(e) {return chart.get_value(id, e)});
				}));
		else
			chart["dendogram" + type]
				.data(cache(function(id) {
					return features.map(function(e) {return chart.get_value(e, id)});
				}));

		chart["dendogram" + type]
			.distance(function(a, b){
				return chart["get_cluster" + type + "Metric"](a, b);
			})
			.cluster();

		var newOrder = chart["dendogram" + type].clusters.val_inds;

		chart.reorder(type, function(a, b){
			return newOrder.indexOf(a) - newOrder.indexOf(b);
		});

		//if(chart.g)
		//	chart.updateLabelPosition();	

		return chart;
	};

	chart.drawDendogram = function(type){
		//if rows (or columns) are not clustered and 
		//thus no dendogram is defined, do nothing
		if(chart["dendogram" + type] === undefined)
			return chart;
		if(chart["dendogram" + type].g === undefined)
			chart["dendogram" + type].place();
		else
			chart["dendogram" + type].g.selectAll("line")
				.remove();
			chart["dendogram" + type].draw();
		return chart;
	};

	chart.updateTexts = function(){
		//add rows
		var rows = chart.g.selectAll(".text_row")
			.data(chart.get_dispRowIds(), function(d) {return d;});
		rows.exit()
			.remove();
		rows.enter()
			.append("g")
				.attr("class", "text_row");

		//add text	
		var text = chart.g.selectAll(".text_row").selectAll(".tval")
			.data(function(d) {
				return chart.get_dispColIds().map(function(e){
					return [d, e];
				})
			}, function(d) {return d;});
		text.exit()
			.remove();
		text.enter()
			.append("text")
				.attr("class", "tval hidden");
		return chart;		
	};
	chart.updateTextPosition = function(){
		if(chart.transitionDuration() > 0 && !chart.transitionOff)
			chart.g.selectAll(".tval").transition("textPosition")
				.duration(chart.transitionDuration())
				.attr("x", function(d){
					return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
				})
				.attr("font-size", chart.cellSize.height * 0.5)								
				.attr("y", function(d) {
					return chart.axes.scale_y(chart.get_heatmapRow(d[0]) ) + chart.cellSize.height * 0.75
				});
		else
			chart.g.selectAll(".tval")
				.attr("x", function(d){
					return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
				})
				.attr("font-size", chart.cellSize.height * 0.5)								
				.attr("y", function(d) {
					return chart.axes.scale_y(chart.get_heatmapRow(d[0])) + chart.cellSize.height * 0.75;
				});
		return chart;
	};
	chart.updateTextValues = function(){
		if(chart.transitionDuration() > 0 && !chart.transitionOff)
			chart.g.selectAll(".tval").transition("textValues")
				.duration(chart.transitionDuration())
				.text(function(d) {
					return chart.get_value(d[0], d[1]).toFixed(1);
			});
		else
			chart.g.selectAll(".tval")
				.text(function(d) {
					return chart.get_value(d[0], d[1]).toFixed(1);
			});
		return chart;
	};


	function updateLegend() {
		chart.legend
			.set_title({"heatmap": ""})
			.add_block(chart.colourScale, "colour", "heatmap");

		return chart;
	}

	function checkMode(){
		if((get_mode() == "svg") && (chart.canvas.classed("active"))) {
			chart.canvas.classed("active", false);
			chart.g.classed("active", true);
			chart.canvas.node().getContext("2d")
				.clearRect(0, 0, chart.plotWidth(), chart.plotHeight());

			if(chart.updateStarted)
				return true;
			else{			
				chart.updateStarted = true;
				chart.updateLabels()
					.updateLabelText()
					.updateCellColour();
				chart.updateStarted = false;
				chart.mark(chart.marked.map(function(e) {return "p" + e.join("_-sep-_")}));
				chart.marked = [];
				return false;
			}
		}
		if((get_mode() == "canvas") && chart.g.classed("active")){
			chart.canvas.classed("active", true);
			chart.marked = chart.g.selectAll(".marked").data();
			chart.g.classed("active", false);
			while (chart.g.node().firstChild) 
    		chart.g.node().removeChild(chart.g.node().firstChild);
		}
		return true;
	}

	chart.updateCanvas = function(){
		var ctx = chart.canvas.node().getContext("2d");
		ctx.clearRect(0, 0, chart.plotWidth(), chart.plotHeight());
		var rowIds = chart.dispRowIds(),
			colIds = chart.dispColIds(),
			ncols = colIds.length, nrows = rowIds.length;
		var pixelHeatmap = document.createElement("canvas");
		pixelHeatmap.width = ncols;
		pixelHeatmap.height = nrows;
		
		//store colour of each cell
		var rgbColour, position;
		//create an object to store information on each cell of a heatmap
		var pixelData = new ImageData(ncols, nrows);

		for(var i = 0; i < nrows; i++)
			for(var j = 0; j < ncols; j++) {
					rgbColour = d3.rgb(chart.get_colour(chart.get_value(rowIds[i], 
																													colIds[j])));
					position = chart.get_heatmapRow(rowIds[i]) * ncols * 4 +
						chart.get_heatmapCol(colIds[j]) * 4;
					pixelData.data[position] = rgbColour.r;
					pixelData.data[position + 1] = rgbColour.g;
					pixelData.data[position + 2] = rgbColour.b;
			}
		//set opacity of pixels
		if(chart.marked.length == 0)
			for(var i = 0; i < ncols * nrows; i++)
				pixelData.data[i * 4 + 3] = 255;
		else
			for(var i = 0; i < ncols * nrows; i++)
				pixelData.data[i * 4 + 3] = 75;
		for(var i = 0; i < chart.marked.length; i++){
			position = chart.get_heatmapRow(chart.marked[i][0]) * ncols * 4 +
						chart.get_heatmapCol(chart.marked[i][1]) * 4;			
			pixelData.data[position + 3] = 255;
		}
		
		//put a small heatmap on screen and then rescale it
		pixelHeatmap.getContext("2d").putImageData(pixelData, 0 , 0);

		ctx.imageSmoothingEnabled = false;
		//probaly no longer required, but let it stay here just in case
    //heatmapBody.mozImageSmoothingEnabled = false;
		//heatmapBody.webkitImageSmoothingEnabled = false;
    //heatmapBody.msImageSmoothingEnabled = false;

		ctx.drawImage(pixelHeatmap, 0, 0, 
			ncols, nrows,
			0, 0,	chart.plotWidth(), chart.plotHeight());

	};

	chart.get_elements = function(data){
		if(data.length == 2 && data[0].substr)
			data = [data];
		data = data.map(function(e) {return "p" + e.join("_-sep-_")});

		if(get_mode() == "svg") 
			return (data.length > 0) ?
				chart.svg.selectAll("#" + escapeRegExp(data.join(",#").replace(/[ .]/g, "_"))) :
				chart.svg.selectAll("______");
		else
			return data;
	};

	chart.get_marked = function(){
		if(get_mode() == "svg"){
			var elements = [];
			chart.svg.selectAll(".marked").each(function() {
				elements.push(d3.select(this).datum());
			});
			return elements;
		} else
			return chart.marked;
	};

	var inherited_mark = chart.mark;
	chart.mark = function(marked){
		if(get_mode() == "svg")
			inherited_mark(marked);
		else {
			if(marked == "__clear__")
				chart.marked = [];
			else {
				if(marked.length && marked[0].substr)
					marked = marked.map(function(e) {return e.substr(1).split("_-sep-_")});
				var ids = chart.marked.map(function(e) {return e.join("_")}),
					ind;
				for(var i = 0; i < marked.length; i++){
					ind = ids.indexOf(marked[i].join("_"));
					if(ind == -1)
						chart.marked.push(marked[i]);
					else {
						chart.marked.splice(ind, 1);
						ids.splice(ind, 1);
					}
				}
			}
		}

		if(get_mode() == "canvas")
			chart.updateCanvas();
		chart.on_marked();
		return chart;
	};	
	
	chart.panMove = function(p) {
		var move = [p[0] - chart.pan("down")[0], p[1] - chart.pan("down")[1]],
			addRows = Math.floor(Math.abs(move[1] / chart.cellSize.height)),
			addCols = Math.floor(Math.abs(move[0] / chart.cellSize.width));
		chart.pan("down")[0] += Math.sign(move[0]) * addCols * chart.cellSize.width;
		chart.pan("down")[1] += Math.sign(move[1]) * addRows * chart.cellSize.height;

		chart.dispColIds(addLines(-Math.sign(move[0]) * addCols, "right"));
		chart.dispColIds(addLines(Math.sign(move[0]) * addCols, "left"));
		chart.dispRowIds(addLines(Math.sign(move[1]) * addRows, "top"));
		chart.dispRowIds(addLines(-Math.sign(move[1]) * addRows, "bottom"));

		if(Math.abs(addRows) + Math.abs(addCols) > 0) {
			chart.updateStarted = true;
			chart.updateLabels();
			chart.updateLabelPosition();
			chart.updateCellColour();
			chart.updateLabelText();
			chart.updateStarted = false;
		}			
	};

	chart.update = function() {
		chart.updateTitle();
		chart.resetColourScale(); //here we create and update the legend. Changing heatmap size does not affect the legent (?)
		chart.dispColIds(function() {return chart.colIds();});
		chart.dispRowIds(function() {return chart.rowIds();});
		chart.axes.x_label
			.text(chart.get_colTitle());
		chart.axes.y_label
			.text(chart.get_rowTitle());
		chart.updateStarted = true;
		chart.updateLabels();
		
		if(chart.clusterRows())
			chart.cluster("Row");
		if(chart.clusterCols())
			chart.cluster("Col");
		
		chart.updateSize()
			.updateLabelText()
			.updateCellColour();
		chart.updateStarted = false;

		return chart;
	};

	return chart;	
}

function sigmoid( x, midpoint, slope ) {
  return 1 / ( 1 + Math.exp( -slope * ( x - midpoint ) ) )
}

function make_stretched_sigmoid( midpoint, slope, xl, xr ) {
  var yl = sigmoid( xl, midpoint, slope, 0, 1 );
  var yr = sigmoid( xr, midpoint, slope, 0, 1 );
  var ym = Math.min( yl, yr );
  return function(x) { return ( sigmoid( x, midpoint, slope, 1 ) - ym ) / Math.abs( yr - yl ) }
}

function colourSlider() {

  // for now only horizontal

  var obj = chartBase()
    .add_property( "straightColourScale" )
    .add_property( "midpoint", undefined )
    .add_property( "slopeWidth", undefined )
    .add_property( "linkedChart", undefined, function(value) {
      if(typeof value === "string"){
        var names = value.split(".");
        value = window[names[0]];
        for(var i = 1; i < names.length; i++)
          value = value[names[i]];
      }
      return value;
    } )
    .add_property( "on_drag", function() {})
		.add_property( "on_change", function() {})
    .margins( { top: 20, right: 10, bottom: 5, left: 10 } )
    .height( 80 )
    .transitionDuration( 0 );    

  obj.showPanel(false);

  obj.straightColourScale(
    d3.scaleLinear()
      .range( [ "white", "darkblue" ] ) );
  
  obj.setStraightColourScale = function() {
    if(obj.linkedChart() && obj.linkedChart().colourScale) {
      obj.straightColourScale(obj.linkedChart().colourScale);
//      obj.linkedChart().colourScale = obj.colourScale;
      if(obj.linkedChart().updateElementStyle) {
        obj.on_drag(obj.linkedChart().updateElementStyle);
      }
      if(obj.linkedChart().updateCellColour) {
        obj.on_drag(obj.linkedChart().updateCellColour);
      }
    }
  };

  var clamp_markers = function() {
    var min = d3.min( obj.get_straightColourScale.domain() );
    var max = d3.max( obj.get_straightColourScale.domain() );
    if( obj.get_midpoint() < min )
       obj.midpoint( min );
    if( obj.get_midpoint() > max )
       obj.midpoint( max );
    if( obj.slopeWidth() > (max-min) )
       obj.slopeWidth( max-min );
    if( obj.slopeWidth() < (min-max) )
       obj.slopeWidth( min-max );
  };
	
  var inherited_put_static_content = obj.put_static_content;
  obj.put_static_content = function( element ) {
    inherited_put_static_content( element );

    var g = obj.svg.append( "g" )
      .attr( "class", "sigmoidColorSlider" )
      .attr( "transform", "translate(" + obj.margins().left + ", " + 
																	obj.margins().top + ")" );  // space for axis

    obj.axis = g.append( "g" )
      .attr( "class", "axis" );

    var defs = g.append( "defs" );

    obj.gradient = defs.append( "linearGradient" )
      .attr( "id", "scaleGradient" + Math.random().toString(36).substring(2, 6))
      .attr( "x1", "0%")
      .attr( "y1", "0%")
      .attr( "x2", "100%")
      .attr( "y2", "0%");

    obj.gradient.selectAll( "stop" )
      .data( d3.range(100) )
      .enter().append( "stop" )
        .attr( "offset", function(d) { return d + "%" } );

    var gradId = obj.gradient.attr("id");

    obj.colorBar = g.append( "rect" )
      .attr( "x", "0" )
      .attr( "y", "5" )
      .attr( "height", 20 )
      .attr( "fill", "url(#" + gradId +")" )
      .style( "stroke", "black" )
      .style( "stroke-width", "1");

    defs.append( "path" )
         .attr( "id", "mainMarker" )
         .attr( "d", "M 0 0 L 8 5 L 8 25 L -8 25 L -8 5 Z")
         .style( "fill", "gray" )
         .style( "stroke", "black" );

    defs.append( "path" )
         .attr( "id", "rightMarker" )
         .attr( "d", "M 0 0 L 5 5 L 5 15 L 0 15 Z")
         .style( "fill", "lightgray" )
         .style( "stroke", "black" );

    defs.append( "path" )
         .attr( "id", "leftMarker" )
         .attr( "d", "M 0 0 L -5 5 L -5 15 L 0 15 Z")
         .style( "fill", "lightgray" )
         .style( "stroke", "black" );

    obj.mainMarker = g.append( "use" )
      .attr( "xlink:href", "#mainMarker")
      .attr( "y", 28 )
      .call( d3.drag()
        .on( "drag", function() {
          obj.midpoint( obj.pos_scale.invert( obj.pos_scale( obj.get_midpoint() ) + d3.event.dx ) );
          clamp_markers();
          obj.get_on_drag();
          obj.update();
        } )
        .on("end", function() {
					obj.get_on_change();
				})
			);

    obj.rightMarker = g.append( "use" )
      .attr( "xlink:href", "#rightMarker")
      .attr( "y", 30 )
      .call( d3.drag()
        .on( "drag", function() {
          obj.slopeWidth( obj.pos_scale.invert( obj.pos_scale( obj.slopeWidth() ) + d3.event.dx ) );
          clamp_markers();
          obj.update();        
          obj.get_on_drag();
        } )
				.on("end", function() {
					obj.get_on_change();
				})
			);

    obj.leftMarker = g.append( "use" )
      .attr( "xlink:href", "#leftMarker")
      .attr( "y", 30 )
      .call( d3.drag()
        .on( "drag", function() {
          obj.slopeWidth( obj.pos_scale.invert( obj.pos_scale( obj.slopeWidth() ) - d3.event.dx ) );
          clamp_markers();
          obj.update();        
          obj.get_on_drag();
        } )
			  .on("end", function() {
				  obj.get_on_change();
			  })
		  );

  };
	
  var inherited_update = obj.update;
  obj.update = function() {
    inherited_update();

    obj.setStraightColourScale();

    if(obj.get_straightColourScale.domain == undefined)
      obj.get_straightColourScale.domain = function() {
        return [0, 1];
      };
		var domain = obj.get_straightColourScale.domain(),
      percScDomain = [],
      posScDomain = [];

    var allNum = true;
    for(var i = 0; i < domain.length; i++){
      percScDomain.push(i * 100 / (domain.length - 1));
      posScDomain.push(i * obj.plotWidth() / (domain.length - 1));
      allNum = (typeof domain[i] === "number") && allNum;
    }

    if(!allNum) {
      obj.colourScale = obj.get_straightColourScale;
      return obj;
    }


    var percent_scale = d3.scaleLinear()
      .domain( percScDomain )
      .range( domain );

    if( obj.get_midpoint() == undefined )
      obj.midpoint( percent_scale( 50 ) );

    if( obj.get_slopeWidth() == undefined )
      obj.slopeWidth( Math.abs(percent_scale( 15 )) );

    obj.pos_scale = d3.scaleLinear()
      .range( posScDomain )
      .domain( domain );

    d3.axisTop()
      .scale( obj.pos_scale )
      ( obj.axis );

    obj.colorBar
      .attr( "width", obj.get_plotWidth() );

    //obj.the_sigmoid = function(x) { return sigmoid( x, obj.get_midpoint(), 1.38 / obj.get_slopewidth(), 0, 1 ) };
    obj.the_sigmoid = make_stretched_sigmoid( obj.get_midpoint(), 1.38 / obj.slopeWidth(), 
      d3.min(obj.get_straightColourScale.domain()), d3.max(obj.get_straightColourScale.domain()) );

    obj.gradient.selectAll( "stop" )
      .data( d3.range(100) )
      .style( "stop-color", function(d) { 
        return obj.get_straightColourScale( 
          percent_scale( 100 * obj.the_sigmoid( percent_scale(d) ) ) ) } ) ;

    obj.colourScale = function(val){
      return obj.get_straightColourScale( 
          percent_scale( 100 * obj.the_sigmoid( val ) ) );
    };

    if(obj.linkedChart() && obj.linkedChart().colour)
      obj.linkedChart().colour(function(val) {
        if(obj.linkedChart().colourValue)
          val = obj.linkedChart().get_colourValue(val);
        return obj.colourScale(val);
      });


    obj.mainMarker
      .attr( "x", obj.pos_scale( obj.get_midpoint() ) );
    obj.rightMarker
      .attr( "x", obj.pos_scale( obj.get_midpoint() + obj.slopeWidth() ) );
    obj.leftMarker
      .attr( "x", obj.pos_scale( obj.get_midpoint() - obj.slopeWidth() ) );

		//obj.get_on_change();

  };

  return obj;

}

function table() {

  var chart = chartBase()
    .add_property( "record", {} );

  chart.showPanel(false);

  var inherited_put_static_content = chart.put_static_content;
  chart.put_static_content = function( element ) {
    inherited_put_static_content(element);
    chart.svg.remove();
    chart.table = chart.container.append( "table" );
  };

  chart.updateSize = function(){
    chart.table
      .style("width", chart.width());
    chart.table.selectAll("td")
      .style("height", chart.height()/Object.keys(chart.record()).length);

    return chart;
  };

  var inherited_update = chart.update;
  chart.update = function( ) {
    inherited_update();
    var sel = chart.table.selectAll( "tr" )
      .data( Object.keys( chart.record() ) );
    sel.exit()
      .remove();  
    sel.enter().append( "tr" )
    .merge( sel )
      .html( function(k) { return "<td>" + k + "</td><td>" 
         + chart.get_record()[k] + "</td>" } );

    chart.table.selectAll("td")
      .style("border-bottom", "1px solid #ddd");

    return chart;
  };

  return chart;
}

//used in R/linked-charts
function html() {
  var chart = chartBase()
    .add_property("content", "");

  chart.width(0)
    .height(0)
    .margins({top: 5, left: 5, bottom: 5, right: 5})
    .showPanel(false);

  var inherited_put_static_content = chart.put_static_content;
  chart.put_static_content = function( element ) {
    inherited_put_static_content(element);
    chart.svg.remove();
    chart.container
      .style("overflow", "auto");
  };

  chart.updateSize = function(){
    chart.container
      .style("width", chart.width() != 0 ? chart.width() : undefined)
      .style("height", chart.height() != 0 ? chart.height() : undefined)
      .style("padding-top", chart.margins().top)
      .style("padding-left", chart.margins().left)
      .style("padding-right", chart.margins().right)
      .style("padding-bottom", chart.margins().bottom);

    return chart;
  };

   
  var inherited_update = chart.update;
  chart.update = function( ) {
    inherited_update();
    chart.container.node().innerHTML = chart.content();
    return chart;
  };

  return chart;
}

exports.base = base;
exports.layerBase = layerBase;
exports.layerChart = layerChart;
exports.chartBase = chartBase;
exports.axesChart = axesChart;
exports.scatter = scatter;
exports.xLine = xLine;
exports.yLine = yLine;
exports.parametricCurve = parametricCurve;
exports.pointLine = pointLine;
exports.pointRibbon = pointRibbon;
exports.heatmap = heatmap;
exports.cache = cache;
exports.separateBy = separateBy;
exports.getEuclideanDistance = getEuclideanDistance;
exports.add_click_listener = add_click_listener;
exports.pearsonCorr = pearsonCorr;
exports.fillTextBlock = fillTextBlock;
exports.get_symbolSize = get_symbolSize;
exports.escapeRegExp = escapeRegExp;
exports.check = check;
exports.call_pacer = call_pacer;
exports.isNaN = isNaN$1;
exports.colourSlider = colourSlider;
exports.table = table;
exports.html = html;
exports.barchart = barchart;
exports.dendogram = dendogram;
exports.beeswarm = beeswarm;

Object.defineProperty(exports, '__esModule', { value: true });

})));
