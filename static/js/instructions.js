instruction_text_element = function(text) {
	return '<div class="instruction-body">'+text+'</div>';
};


svg_element = function(id, width, height) {
	return '<div class="svg-container" width="'+width+'" height="'+height +
           '"><svg width="'+width+'" height="'+height+'" id="'+id+'"></svg></div>'
};



function init_instruction(obj, id) {
	obj.id = id;
	output(['instructions', id]);

	psiTurk.showPage('instruct.html');
	obj.div = $('#container-instructions');

	obj.add_text = function(t) {
		obj.div.append(instruction_text_element(t));
	};

	return obj;
};


var Instructions1 = function() {
	var self = init_instruction(this, 1);

	self.add_text('Welcome! In this experiment your goal is to claim virtual pots of gold. These ' +
		    'pots are called <i>urns</i>, and look like this:');

	self.div.append(svg_element('urn-svg', 800, 220));
	self.stage = d3.select('#urn-svg');

	var g = generate_gamble(1)['options']['A'];
	self.urn = new Option(self.stage, 'A', 1).draw();

	self.urn.listen(function() {
            self.urn.draw_sample(g.random(), undefined, 1000, true);
        });

	self.add_text('Each urn that you see is filled with 100 coins of ' +
		    'differing values. You can learn about the coins that are inside an urn by ' +
			'clicking on it. Go ahead and click on the urn above a few times to see what kinds of coins ' +
			'it contains.');

	self.add_text('When you click on the urn you see a randomly drawn coin (which is then put back ' +
			'into the urn, so the total number of coins never changes). During the experiment you\'ll ' +
			'have the chance to claim urns that you think are valuable, and at the end you will receive ' +
			'a bonus based on the <b>average value of the coins</b> inside the urns you select.');

    self.add_text('Press the \'C\' button to continue.');
	add_next_button(Instructions2);
};




var Instructions2 = function() {
	var self = init_instruction(this, 3);

	self.add_text('In this experiment you will compete ' +
				  'to claim urns that you think are valuable. In each game you will ' +
				  'see two urns, and you will be able to learn about them by clicking on them ' +
				  'as before. When you think that one urn is more valuable than the ' +
				  'other, you can stop and claim it.');

	self.add_text('Each game is made up of a series of turns. On each turn, you begin by ' +
		          'clicking on one urn and seeing a randomly drawn coin. You then have a choice ' +
			      'to make: you can either 1) <strong>Continue Learning</strong>, ' +
			      'or you can 2) <strong>Stop and Choose</strong>, ' +
			      'which means that you are ready to claim an urn.');

	self.add_text('Go ahead and try it for these two urns:');

	self.div.append(svg_element('urn-svg', 800, 260));
	self.stage = d3.select('#urn-svg');

	var g = generate_gamble(2);
	self.urns = {'A': new Option(self.stage, 'A', 2),
				 'B': new Option(self.stage, 'B', 2)};
	self.urns['A'].draw();
	self.urns['B'].draw();

	var sampling = function() {

            $('#belowStage').css('display', 'block');
            $('#instruction').html('Click on the urn you want to learn about');

            $.each(self.urns, function(i, urn) {
                    urn.listen(function() {
                        var r = g['options'][urn.id].random();
                        urn.draw_sample(r);
                        show_buttons();
                    });
            });
	};

	var show_buttons = function() {
        $('#instruction').html('');
		$.each(self.urns, function(i, urn) { urn.stop_listening(); });

		add_stop_and_continue_buttons(
				function() {
					clear_buttons();
					$.each(self.urns, function(i, urn) { urn.clear_sample(); });
					sampling();
				},
				function() {
					clear_buttons();
					$.each(self.urns, function(i, urn) { urn.clear_sample(); });
					choose();
				}
		);

	};

	var choose = function() {
        $('#belowStage').css('display', 'block');
        $('#instruction').html('Claim the urn that you think is more valuable');

		$.each(self.urns, function(i, urn) {
			urn.listen(function() {
				urn.highlight();
				$.each(self.urns, function(i, urn) { urn.stop_listening(); });
				finish();
			});
		});

	};

	var finish = function() {
            $('#instruction').html('');

            self.add_text('The blue person marks the urn that you chose. At the end ' +
                          'of the experiment, one of the urns you claim will be randomly ' +
                          'selected, and your bonus will be the average value of the coins ' +
                          'in that urn.');

            add_next_button(InstructionsComplete);
	};

	$.each(self.urns, function(i, urn) {
		urn.draw();
	});
	sampling();

};


var InstructionsComplete = function() {
	var self = init_instruction(this, 'complete');

    self.add_text('Good job! Looks like you\'re ready to start playing. You will play a series of ' +
			      NROUNDS + ' games. After you\'ve finished, you will see the value of all of the urns ' +
			      'that you choose and your final bonus for the experiment.');

	self.add_text('Click below to start the first game. Good luck!');
    add_next_button(exp.begin);
};
