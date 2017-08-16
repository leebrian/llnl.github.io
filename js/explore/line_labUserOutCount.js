/* Creates line graph visualization for webpage */
function draw_line_labUserOutCount(areaID) {

	var UsersVars = {
		obj:null,
		yearList:null,
		datPrefix:'membersRepos'
	};
	var SortedVars = {
		obj:null,
		yearList:null,
		datPrefix:'reposOwnership'
	};

	d3.json(ghDataDir+'/YEARS.json', function(obj) {
		UsersVars.yearList = obj[UsersVars.datPrefix];
		SortedVars.yearList = obj[SortedVars.datPrefix];
		yearCollection(UsersVars);
		yearCollection(SortedVars);
	});

	function yearCollection(someVars) {
		var yearList = someVars.yearList;
		var datPrefix = someVars.datPrefix;
		var yearQ = d3.queue();
		// load each year file
		yearList.forEach(function(nYEAR) {
			var url = ghDataDir+'/'+datPrefix+'.'+nYEAR+'.json';
			yearQ.defer(d3.json, url);
		});
		// Merge data
		yearQ.awaitAll(function(error, response){
			var combinedData = {};
			for (var i=0; i < response.length; i++) {
				Object.assign(combinedData, response[i]);
			};
			someVars.obj = combinedData;
			// Once all files are read, process data, and draw visualization
			if (UsersVars.obj && SortedVars.obj) {
				var data = reformatData(UsersVars.obj,SortedVars.obj);
				drawGraph(data, areaID);
			}
		});
	};
	

	// Draw graph from data
	function drawGraph(data, areaID) {

		var graphHeader = "Lab Members Contributing to Outside Repos";

		var parseTime = d3.timeParse("%Y-%m-%d");
		var formatTime = d3.timeFormat("%Y-%m-%d");

		data.forEach(function(d) {
			d.date = parseTime(d.date);
			d.value = +d.value;
		});

		var margin = stdMargin,
			width = stdWidth,
			height = stdHeight,
			maxBuffer = stdMaxBuffer;
		
		var x = d3.scaleTime()
			.domain(d3.extent(data, function(d) { return d.date; }))
			.range([0, width]);
		
		var y = d3.scaleLinear()
			.domain([0, d3.max(data, function(d) { return d.value; })*maxBuffer])
			.range([height, 0])
			.nice();

		var xAxis = d3.axisBottom()
			.scale(x);
		
		var yAxis = d3.axisLeft()
			.scale(y);

		var tip = d3.tip()
			.attr('class', 'd3-tip')
			.offset([-10, 0])
			.html(function(d) {
				var users = " Users";
				if (d.value == 1) {
					users = " User";
				}
				return "<sub>["+formatTime(d.date)+"]</sub>"+"<br>"+d.value+users;
			});
		
		var valueline = d3.line()
			.x(function(d) { return x(d.date); })
			.y(function(d) { return y(d.value); });

		var chart = d3.select("."+areaID)
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		  .append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		chart.call(tip);
		
		// Add the x axis
		chart.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
		
		// Add the y axis
		chart.append("g")
			.attr("class", "y axis")
			.call(yAxis);

		// Add title
		chart.append("text")
			.attr("class", "graphtitle")
			.attr("x", (width / 2))
			.attr("y", 0 - (margin.top / 3))
			.attr("text-anchor", "middle")
			.text(graphHeader);
		
		// Draw line
		chart.append("path")
			.datum(data)
			.attr("class", "line")
			.attr("d", valueline);

		// Draw dots
		chart.selectAll(".circle")
			.data(data)
		  .enter().append("circle")
			.attr("class", "circle")
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return y(d.value); })
			.attr("r", stdDotRadius)
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide);

		// Angle the axis text
		chart.select(".x.axis")
			.selectAll("text")
			.attr("transform", "rotate(12)")
			.attr("text-anchor", "start");
	};


	// Turn json objs into desired working data
	function reformatData(objUsrs, objSorted) {
		var dates = Object.keys(objSorted);
		dates.sort();
		var data = [];
		dates.forEach(function (timestamp) {
			// Get list of outsideRepositories for this date
			var outsideNodes = objSorted[timestamp]["outsideRepositories"]["nodes"];
			var outsideRepos = [];
			for (var i=0; i < outsideNodes.length; i++) {
				outsideRepos.push(outsideNodes[i]["nameWithOwner"]);
			};
			// Count users contributing to repos in that list
			var userTotal = 0;
			for (var usr in objUsrs[timestamp]) {
				if (objUsrs[timestamp].hasOwnProperty(usr)) {
					var usrRepoNodes = objUsrs[timestamp][usr]["contributedRepositories"]["nodes"];
					for (var i=0; i < usrRepoNodes.length; i++) {
						if (outsideRepos.contains(outsideNodes[i]["nameWithOwner"])) {
							// Only count each user once as soon as any outside repo is found
							userTotal += 1;
							break;
						};
					};
				};
			};
			data.push({date: timestamp, value: userTotal});
		});
		return data;
	};

}