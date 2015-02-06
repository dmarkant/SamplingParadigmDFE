/*
 * options.js
 *
 */

function load_option_sets(path) {

    output('loading option sets from: ' + path);
    var results = [];
	$.ajax({url: path,
			success: function(data) {
				$.each(data.split('\n'), function() {
					var optset = this.split(',');
					if (optset[0]!="" && optset[2]==OPT_CONDITION) {
						results.push({'id': Number(optset[1]),
									  'env': Number(optset[2]),
									  'A_low': Number(optset[3]),
									  'A_high': Number(optset[4]),
									  'A_p': Number(optset[5]),
									  'A_ev': Number(optset[6]),
									  'B_low': Number(optset[7]),
									  'B_high': Number(optset[8]),
									  'B_p': Number(optset[9]),
									  'B_ev': Number(optset[10])});
					};
				});
			},
            error: function() {
                output('failed to load option sets!');
            },
			async: false
	});
    return results;
};


var discrete_expected_value = function(option) {
	return option['H']*option['p'] + option['L']*(1-option['p']);
};


function sample_from_discrete(option) {

	if (Math.random() < option.p) {
		return option.H;
	} else {
		return option.L;
	};
};


function sample_uniform_with_seed(n, set, seed) {
    // choose a random starting point between (0, set.length-n),
    // using the provided value as a seed
    var ran = new Random(seed);
    var i = Math.floor(ran.uniform(0, set.length - n));
    return set.slice(i, i + n);
};



var generate_gamble = function(N) {
	var options = {};
	$.each(OPTIONS, function(i, id) {
		options[id] = new Urn(id);
	});
	return {'options': options};
};


var generate_gamble_from_optset = function(round) {
	var opt = OPTSETS_SAMPLED[round];
	var options = {'A': new UrnFromPar('A',
									   opt['A_low'],
									   opt['A_high'],
									   opt['A_p'],
									   opt['A_ev']),
				   'B': new UrnFromPar('B',
									   opt['B_low'],
									   opt['B_high'],
									   opt['B_p'],
									   opt['B_ev'])};
	return {'options': options};
};


var UrnFromPar = function(id, low, high, p, ev) {
    // Create an option from supplied parameters
    //
    // low: lower outcome
    // high: higher outcome
    // p: probability of the high outcome
    // ev: expected value
	var self = this;
	self.par = {'H': high, 'L': low, 'p': p};
	self.expected_value = ev;
	self.random = function() {
		return sample_from_discrete(self.par);
	};
	return self;
};



ranran = new Random(124); // change seed
var Urn = function(id) {
	var self = this;
	self.id = id;

	if (OPT_ENVIRONMENT == 'discrete-normal') {
		var nd1 = NormalDistribution(10, 30);
		var o1 = nd1.sampleInt();
		var nd2 = NormalDistribution(40, 90);
		var o2 = nd2.sampleInt();
		var p = jStat.beta.sample(4, 4);
		output(['[o1, o2, p]:', [o1, o2, p]]);

		self.par = {'H': o1, 'L': o2, 'p': p};
		self.random = function() {
			return sample_from_discrete(self.par);
		};
		self.expected_value = discrete_expected_value(self.par);

	};

	if (OPT_ENVIRONMENT == 'discrete-skewed') {
		var nd1 = NormalDistribution(10, 30);
		var o1 = nd1.sampleInt();
		var nd2 = NormalDistribution(40, 90);
		var o2 = nd2.sampleInt();
		var p = jStat.beta.sample(7, 1);
		output(['[o1, o2, p]:', [o1, o2, p]]);

		self.par = {'H': o1, 'L': o2, 'p': p};
		self.random = function() {
			return sample_from_discrete(self.par);
		};
		self.expected_value = discrete_expected_value(self.par);
		//
	};

};


//
// Option object for displaying urn, sampling outcomes,
// and selecting for final choice
//
var Option = function(stage, id, n_options) {

	var self = this;
	self.id = id;
	self.index = OPTIONS.indexOf(self.id);
	self.stage = stage;

	// work out positioning based on stage size and number of options
	self.row = Math.floor(self.index / 4);
	self.col = self.index % 4;
	self.stage_w = Number(self.stage.attr("width"));
	self.stage_h = Number(self.stage.attr("height"));

	switch (n_options) {
		case 1:
			self.x = self.stage_w/2;
			self.y = 30 + self.stage_h/4;
			break;
		case 2:
			self.x = 220 + (self.stage_w-140)/2 * self.col;
			self.y = 30 + self.stage_h/4;
			break;
		default:
			self.x = 100 + self.stage_w/4 * self.col;
			self.y = 80 + self.stage_h/2 * self.row;
	};

	self.sample_x = self.x;
	self.sample_y = self.y + 50;

	// state variables
	self.chosen = false;
	self.available = true;
	self.n_opp_samples = 0;

	// drawing of options
	self.disp = self.stage.append('g')
						  .attr('id', self.id)
						  .attr('opacity', 1.);

	self.draw = function() {
		self.obj = self.disp.append('image')
							.attr('x', self.x-100)
							.attr('y', self.y-80)
							.attr('width', 200)
							.attr('height', 200)
							.attr('xlink:href', 'static/images/pot.png');

		self.label = self.disp.append('text')
							  .attr('x', self.x)
							  .attr('y', self.y+60)
							  .attr('text-anchor', 'middle')
							  .attr('class', 'optionlabel')
							  .attr('stroke', 'gray')
							  .text(self.id);

		if (self.chosen) {
			self.highlight();
		} else {

			if (!self.available) {
				self.disp.attr('opacity', OPTION_FADE_OPACITY);
				self.expiration_label = self.stage.append('text')
									.attr('x', self.x)
									.attr('y', self.y+140)
									.attr('class', 'expirationlabel')
									.attr('text-anchor', 'middle')
									.attr('fill', '#DF0101')
									.text('CLAIMED')
									.attr('opacity', 0.);

			};
		};


		return self;
	};

	self.highlight = function() {

        self.chosen = true;

		self.obj.attr('opacity', OPTION_FADE_OPACITY);
		self.label.attr('opacity', OPTION_FADE_OPACITY);

		self.highlighter = self.disp.append('image')
								    .attr('x', self.x-50)
								    .attr('y', self.y-10)
								    .attr('width', 100)
								    .attr('height', 100)
								    .attr('xlink:href', 'static/images/person_self.png');

		self.expiration_label = self.stage.append('text')
							 .attr('x', self.x)
							 .attr('y', self.y+140)
							 .attr('class', 'expirationlabel')
							 .attr('text-anchor', 'middle')
							 .attr('fill', '#E6E6E6')
							 .text('CLAIMED')
							 .attr('opacity', 0.)
							 .transition()
							   .delay(300)
							   .duration(200)
							   .attr('opacity', 1);

		return self;
	};

	self.draw_sample = function(value, loc, duration, backon) {

		loc = loc || [self.sample_x-60, self.sample_y-60];
		backon = backon || false;

		self.coin = self.disp.append('g').attr('id', 'coin');

		self.coin_circle = self.coin.append('circle')
									.attr('r', 50)
									.attr('cx', self.x)
									.attr('cy', self.y+60)
									.attr('width', 100)
									.attr('height', 100)
									.attr('stroke', '#E4DF61')
									.attr('stroke-width', 5)
									.attr('fill', '#FFF971')
									.transition()
									  .duration(300)
									  .attr('opacity', 1);

		self.coin_label = self.coin.append('text')
				   .attr('x', loc[0]+60)
				   .attr('y', loc[1]+85)
				   .attr('text-anchor', 'middle')
				   .attr('fill', '#A39D00')
				   .attr('class', 'samplefeedback')
				   .text(value)
				   .attr('opacity', 0)
				   .transition()
				     .duration(300)
					 .attr('opacity', 1);

		if (duration!=undefined) {
			setTimeout(function() {
				self.clear_sample();
				if (backon) self.listen();
			}, duration);
		};

	};

	self.clear_sample = function() {
		if (self.coin != undefined) self.coin.remove();
		if (self.opp_samples != undefined) self.opp_samples.remove();
		self.n_opp_samples = 0;
	};

	self.listen = function(callback) {
		if (callback!=undefined) self.selection_callback = callback;
		self.disp.on('mousedown', function() {
			self.stop_listening();
			if (self.selection_callback!=undefined) self.selection_callback(self.id);
		});
		return self;
	};

	self.click = function() {
		self.selection_callback(self.id);
	};

	self.stop_listening = function() {
		self.disp.on('mousedown', function() {} );
	};

	self.erase = function() {
		self.stage.select(self.id).remove();
	};

	return self;
};
