/*
 * options.js
 *
 */

function discrete_expected_value(X, P) {
    // calculate an option's EV given array of
    // outcomes (X) and respective probabilities (P)
    var ind = range(X.length);
    return array_sum(_.map(ind, function(i) { return P[i]*X[i]; }));
};


function sample_from_discrete(X, P) {
    // generate an outcome from X given discrete
    // probability distribution (P)
    var r = Math.random();
    var cs = cumsum(P);
    var i = _.map(cs, function(p) { return 1*(p > r); }).indexOf(1);
    return X[i];
};


function generate_gamble_from_optset(round) {
	var opt = OPTSETS_SAMPLED[round];
	var xind = range(N_OUTCOMES_PER_OPTION);
    var options = {};
    $.each(OPTIONS, function(i, label) {
        X = _.map(xind, function(i) { return Number(opt[label+'_x'+i]); });
        P = _.map(xind, function(i) { return Number(opt[label+'_p'+i]); });
        ev = Number(opt[label+'_ev']);
        options[label] = new UrnFromPar(label, X, P, ev);
    });
	return {'options': options};
};


function generate_gamble(N) {
	// randomly generate an option for use in
    // instructional phase
    var options = {};
	$.each(range(N), function(i) {
        var label = OPTIONS[i];
		options[label] = new Urn(label);
	});
	return {'options': options};
};


var UrnFromPar = function(id, X, P, ev) {
    // X: array of outcomes
    // P: array of probabilities
    // ev: expected value
	var self = this;
	self.id = id;
    self.X = X;
    self.P = P;
    self.expected_value = ev;
	self.random = function() {
		return sample_from_discrete(X, P);
	};
	return self;
};


var Urn = function(id) {
	var self = this;
	self.id = id;

    // note: not sure why I did this method.. just meant to
    // create a new option from scratch rather than use
    // one of the option sets loaded from the CSV file.
    var nd1 = NormalDistribution(10, 30);
    var o1 = nd1.sampleInt();
    var nd2 = NormalDistribution(40, 90);
    var o2 = nd2.sampleInt();
    var p = jStat.beta.sample(4, 4);

    self.X = [o1, o2];
    self.P = [p, 1-p];
    self.expected_value = discrete_expected_value(self.X, self.P);
    self.random = function() {
        return sample_from_discrete(self.X, self.P);
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
