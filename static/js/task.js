var exp,
	NROUNDS = 8,
	N_OPTIONS = 2,
	OPTIONS = ['A', 'B'],
	OPTION_FADE_OPACITY = 0.3,
	INIT_BONUS = 0,
	BASE_PAYMENT = .5,
	chosen_values = [],
	final_bonus;



// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
var LOGGING = mode != "debug";

psiTurk.preloadPages(['instruct.html',
					  'stage.html',
					  'feedback.html']);

psiTurk.preloadImages(['static/images/pot.png',
					   'static/images/person_other.png',
					   'static/images/person_self.png']);


// loading/sampling option sets
var OPT_CONDITION = condition;
//var OPT_ENVIRONMENT = 'discrete-normal'; // for randomly generating options
var OPTSETS_PATH = 'static/exp1_option_sets.csv'; // predefined option sets
var OPTSETS = load_option_sets(OPTSETS_PATH);
seed = new Date().getTime()
var OPTSETS_SAMPLED = sample_uniform_with_seed(NROUNDS, OPTSETS, seed);


// Generic function for saving data
function output(arr) {
    psiTurk.recordTrialData(arr);
    if (LOGGING) console.log(arr.join(" "));
};


function clear_buttons() {
	$('#buttons').html('');
};


function add_next_button(callback) {

	var label = 'Continue (press \'C\')';
	$('#buttons').append('<button id=btn-next class="btn btn-default btn-lg">'+label+'</button>');

	$(window).bind('keydown', function(e) {
		if (e.keyCode == '67') {
			$(window).unbind('keydown');
			callback();
		};
	});

};

function add_stop_and_continue_buttons(continue_callback, stop_callback, accept_keypress) {

	var accept_keypress = accept_keypress || true;

	$('#buttons').append('<button id=btn-continue class="btn btn-default btn-info btn-lg">Continue Learning (press \'C\')</button>');
	$('#buttons').append('<button id=btn-stop class="btn btn-default btn-primary btn-lg">Stop and Choose (press \'S\')</button>');

	// if allowing keypresses, set up handlers
	if (accept_keypress) {

		$(window).bind('keydown', function(e) {

			// 'C' for continue
			if (e.keyCode == '67') {
				$(window).unbind('keydown');
				continue_callback();
			};

			// 'S' for stop
			if (e.keyCode == '83') {
				$(window).unbind('keydown');
				stop_callback();
			};
		});

	} else {
		$('#btn-continue').on('click', continue_callback);
		$('#btn-stop').on('click', stop_callback);
	};

};



var SamplingGame = function(round, callback, practice) {

	var self = this;
	self.round = round;
	self.practice = practice;
	self.trial = -1;
	self.n_options = N_OPTIONS;
	self.gamble = generate_gamble_from_optset(self.round);
	output(['game', self.round, 'option', 'A', self.gamble.options.A.H, self.gamble.options.A.L, self.gamble.options.A.p])
	output(['game', self.round, 'option', 'B', self.gamble.options.B.H, self.gamble.options.B.L, self.gamble.options.B.p])

	self.reset_stage = function(callback) {
		psiTurk.showPage('stage.html');
		self.stage = d3.select("#stagesvg");
		self.above_stage = d3.select("#aboveStage");
		self.below_stage = d3.select("#belowStage");
		self.instruction = d3.select("#instruction");
		self.buttons = d3.select("#buttons");
		self.above_stage.html('<h1>Game '+(self.round+1)+'/'+NROUNDS+'</h1>');

		self.options = {};
		for (var i=0; i<self.n_options; i++) {
			var opt_label = OPTIONS[i];
			self.options[opt_label] = new Option(self.stage, opt_label, self.n_options);
		};

		callback();
	};


	self.set_instruction = function(text) {
		self.instruction.html('<div id="turn-number">TURN '+(self.trial+1)+'</div>'+text);
	};


	self.toggle_instruction_color = function(on) {
		if (on) {
			$('#turn-number').css({'background-color': '#04B404', 'color': 'white'});
		} else {
			$('#turn-number').css({'background-color': 'white', 'color': 'gray'});
		};
	};


	self.begin = function() {
		self.reset_stage(self.sampling_trial);
	};


	self.sampling_trial = function() {
		self.trial += 1;

		// only draw the urns on the first trial
		if (self.trial == 0) $.each(self.options, function(i, opt) { opt.draw(); });

		var avail = [];
		$.each(self.options, function(i, opt) {
			if (opt.available) {
				avail.push(opt.id);
				opt.listen(self.generate_sample);
			};
		});

		self.set_instruction('Click the urn you want to learn about.');
		self.toggle_instruction_color(true);
	};


	self.generate_sample = function(chosen_id) {
		var msg_id = 'sample_decision_'+self.round+'.'+self.trial;
		$.each(self.options, function(i, opt) { opt.stop_listening(); });

		result = self.gamble.options[chosen_id].random();
		output(['game', self.round, self.trial, 'sample', chosen_id, result]);

		// show feedback
		self.toggle_instruction_color(false);
		self.options[chosen_id].draw_sample(result);
		self.prompt_stop_or_continue();
	};


	self.prompt_stop_or_continue = function() {

		add_stop_and_continue_buttons(
			function() {
				$.each(self.options, function(i, opt) { opt.clear_sample(); });
				clear_buttons();
				self.sampling_trial();
			},
			function() {
				self.stop_trial = self.trial;
				self.urn_selection();
		});
		self.set_instruction('Do you want to <strong>Continue Learning</strong> or ' +
							 '<strong>Stop and Choose</strong> one of the options?');
	};

	self.urn_selection = function() {

		// remove any chosen options from the choice set
		$.each(self.options, function(i, opt) { opt.clear_sample(); });
		clear_buttons();

		var make_selection = function(chosen_id) {
			self.chosen_id = chosen_id;
			self.options[chosen_id].chosen = true;
			self.options[chosen_id].highlight();
			self.finish();
		};

		var avail = [];
		$.each(self.options, function(i, opt) {
			avail.push(opt);
			opt.listen(make_selection)
		});
		self.set_instruction('Click on the urn you want!');
	};

	self.finish = function() {
		output(['game', self.round, self.trial, 'received_id', self.chosen_id])
		chosen_values.push(self.gamble.options[self.chosen_id].expected_value);
		self.set_instruction('Click below to continue to the next game!');
		add_next_button(exp.next);
	};

	self.reset_stage(self.begin);
	return self;
};


var Feedback = function() {
	$('#main').html('');
	var self = this;
	psiTurk.showPage('feedback.html');
	self.div = $('#container-instructions');

	// calculate final bonus
	final_bonus = INIT_BONUS;
	for (var i=0; i<NROUNDS; i++) {
		final_bonus += chosen_values[i]/1000;
	};
	output(['instructions', 'feedback', 'final_bonus', final_bonus]);


	var t = 'All done! Now you can see the results of your choices across all the games you ' +
		    'played, and how they impact your final bonus:';
	self.div.append(instruction_text_element(t));

	html =  '<div id=feedback-table>';
	for (var i=0; i<NROUNDS; i++) {
		html +=	'<div class=row><div class=left>Game '+(i+1)+':</div>' +
				'<div class=right>'+(chosen_values[i]/100).toFixed(2)+'</div></div>';
	};
	html +=	'<div class=row style="border-top: 1px solid black; font-weight: bold;">'+
			'<div class=left>Final bonus:</div><div class=right>$'+Math.max(0, final_bonus).toFixed(2)+'</div></div>';
	html += '</div>'
	self.div.append(html);


	var t = 'You will be eligible to receive the bonus after you\'ve answered the following questions:'
	self.div.append(instruction_text_element(t));

	var error_message = '<h1>Oops!</h1><p>Something went wrong submitting your HIT. '+
					    'Press the button to resubmit.</p><button id=resubmit>Resubmit</button>';

	record_responses = function() {

		psiTurk.recordTrialData(['postquestionnaire', 'submit']);

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});

		Exit();
	};

	$("#btn-submit").click(function() {
		record_responses();
	});

};


var Exit = function() {
	output('COMPLETE');
	psiTurk.saveData();
	psiTurk.completeHIT();
};


var SamplingExperiment = function() {
	var self = this;
	self.round = -1;
	chosen_values = [];

	self.next = function() {
		psiTurk.saveData();
		self.round += 1;
		if (self.round < NROUNDS) self.view = new SamplingGame(self.round, self.next, false);
		else self.finish();
	};

	self.instructions = function() {
		Instructions1();
	};

	self.begin = function(group) {
		psiTurk.finishInstructions();
		self.next();
	};

	self.finish = function() {
		Feedback();
	};

};


// vi: noexpandtab tabstop=4 shiftwidth=4
