$(function () {
    var RETURN = 1;
    var AUTHOR_REWARDS = 0.75;
    var MIN_VOTE = 20;
    var CURRENCY = 'USD';
	var bots = [];
    var bot_names = [];
    var other_bots = [];
    var FULL_CURATION_TIME = 30 * 60 * 1000;
	
	startup();
	
	function startup() {
		try {
			if (Notification && Notification.permission !== "granted")
				Notification.requestPermission();
		} catch (err) { }
		
		loadPrices();
		setInterval(loadPrices, 30 * 1000);
		
		loadOtherBots();
		setInterval(loadOtherBots, 10 * 60 * 1000);
		
		loadBidBots();
		setInterval(loadBidBots, 30 * 1000);
		
		setInterval(updateTimers, 1000);
	}

    function sendNotification(bot, bid) {
        try {
            if (Notification.permission !== "granted")
                Notification.requestPermission();
            else {
                var notification = new Notification('Profitable Bidding Opportunity!', {
                    icon: 'https://i.imgur.com/SEm0LBl.jpg',
                    body: "@" + bot + ' is currently showing a profitable bidding opportunity! Max profitable bid is $' + bid.formatMoney() + ' SBD.'
                });
            }
        } catch (err) { }
    }

    function loadPrices() {
      // Load the current prices of STEEM and SBD
      $.get('https://api.coinmarketcap.com/v1/ticker/steem/', function (data) {
        steem_price = parseFloat(data[0].price_usd);
        $('#steem_price').text(steem_price.formatMoney());
      });

      // Load the current prices of STEEM and SBD
      $.get('https://api.coinmarketcap.com/v1/ticker/steem-dollars/', function (data) {
        sbd_price = parseFloat(data[0].price_usd);
        $('#sbd_price').text(sbd_price.formatMoney());
      });
    }

    function loadOtherBots() {
      $.get('http://localhost:3000/other_bots', function (data) { 
		data.sort(function (a, b) { return b.vote_value - a.vote_value; });
		
		var container = $('#other_table tbody');
        container.empty();
		
		for(var i = 0; i < data.length; i++) {
			var bot = data[i];
			
			var row = $(document.createElement('tr'));
			var td = $('<td><a target="_blank" href="https://steemit.com/@' + bot.name + '">@' + bot.name + '</a></td>');
			row.append(td);

			td = $('<td>$' + bot.vote_value.toFixed(2) + '</td>');
			row.append(td);

			td = $('<td>' + (bot.profile.about ? bot.profile.about : '') + '</td>');
			row.append(td);

			td = $('<td>' + (bot.profile.website ? '<a target="_blank" href="' + bot.profile.website + '">' + bot.profile.website + '</a>' : '') + '</td>');
			row.append(td);
			container.append(row);
		}
	  });
    }

	function loadBidBots() {
		$.get('http://localhost:3000/bid_bots', function (data) {
			// Populate the drop down list of bots for the vote value calculator
			data.map(function(b) { return b.name }).sort().forEach(function(name) {
				$('#bot_list').append('<option value="' + name + '">' + name + '</option>');
			});
			
			bots = data;
			showBidBots();
		});
	}
	
	function showBidBots() {
		$('#bots_table tbody').empty();

		// Order the bots by their next vote time
		bots.sort(function(a, b) {
			var an = (a.power == 100 && a.last > 3 * HOURS || a.last < 60 * 1000) ? 9990000000 : a.next;
			var bn = (b.power == 100 && b.last > 3 * HOURS || b.last < 60 * 1000) ? 9990000000 : b.next;
			return an - bn;
		});

		for(var i = 0; i < bots.length; i++) {
			var bot = bots[i];
		  
			// Don't show bots that are filtered out
			if (bot.vote_usd < MIN_VOTE || (_filter.verified && !bot.api_url) || (_filter.refund && !bot.refunds) || (_filter.steem && !bot.accepts_steem) || (_filter.funding && !bot.funding_url) || (_filter.nocomment && (bot.posts_comment == undefined || bot.posts_comment)))
			  continue;

			var bid_sbd = (AUTHOR_REWARDS * bot.vote_usd - RETURN * bot.total_usd) / sbd_price;
			var bid_steem = bot.accepts_steem ? (AUTHOR_REWARDS * bot.vote_usd - RETURN * bot.total_usd) / steem_price : 0;

			var row = $(document.createElement('tr'));

			var td = $(document.createElement('td'));
			var link = $(document.createElement('a'));
			link.attr('href', 'http://www.steemit.com/@' + bot.name);
			link.attr('target', '_blank');
			var text = '@' + bot.name;

			if(bot.power == 100 && bot.last > 4 * HOURS || bot.power < 90)
			  text += ' (DOWN)';

			link.html("<img class='userpic' src='https://steemitimages.com/u/" + bot.name + "/avatar'></img>" + text);
			td.append(link);

			if(bot.comments) {
				var icon = $('<span class="fa fa-comment-o ml5" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Allows Comments"></span>');
				td.append(icon);
			}

			if (bot.posts_comment != undefined && !bot.posts_comment) {
			  var icon = $('<img src="img/no_comment.png" style="width: 20px; margin-left: 5px;" data-toggle="tooltip" data-placement="top" title="This bot does not post a comment when it votes on a post." />');
			  td.append(icon);
			}

			if(bot.accepts_steem) {
			  var icon = $('<img src="img/steem.png" style="width: 20px; margin-left: 5px;" data-toggle="tooltip" data-placement="top" title="This bot accepts STEEM bids!" />');
			  td.append(icon);
			}

			if(bot.refunds) {
				var icon = $('<img src="img/refund.png" style="width: 20px; margin-left: 5px;" data-toggle="tooltip" data-placement="top" title="This bot automatically refunds invalid bids!" />');
				td.append(icon);
			}

			if (bot.funding_url) {
			  var icon = $('<a href="' + bot.funding_url + '" target="_blank"><img src="img/funding.png" style="width: 20px; margin-left: 5px;" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="This bot uses a portion of its earnings to fund other projects and initiatives - Click for Details"/></a>');
			  td.append(icon);
			}

			row.append(td);

			td = $(document.createElement('td'));
			td.text(formatCurrencyVote(bot));
			row.append(td);

			var steem_bid = '';
			if(bot.accepts_steem){
			  if(bot.min_bid_steem && bot.min_bid_steem != bot.min_bid)
				steem_bid = ' or ' + bot.min_bid_steem.formatMoney() + ' <img src="img/steem.png" style="width: 17px; vertical-align: top;"/>';
			  else
				steem_bid = ' or <img src="img/steem.png" style="width: 17px; vertical-align: top;"/>';
			}

			td = $(document.createElement('td'));
			td.html(bot.min_bid.formatMoney() + ' SBD' + steem_bid);
			row.append(td);

			td = $(document.createElement('td'));
			td.text((bot.fill_limit ? ((1 - bot.fill_limit) * 100).toFixed() + '%' : 'none'));
			row.append(td);

			td = $(document.createElement('td'));
			td.text((bot.max_post_age ? bot.max_post_age + ' days' : 'unknown'));
			row.append(td);

			td = $(document.createElement('td'));
			td.text(formatCurrencyTotal(bot));
			row.append(td);

			td = $(document.createElement('td'));
			if (bot.accepts_steem)
			  td.html(Math.max(bid_steem, 0).formatMoney() + ' <img src="img/steem.png" style="width: 17px; vertical-align: top;"/> or ' + Math.max(bid_sbd, 0).formatMoney() + ' SBD');
			else
			  td.text(Math.max(bid_sbd, 0).formatMoney() + ' SBD');

			row.append(td);

			td = $(document.createElement('td'));
			td.addClass('timer');
			td.attr('dir', 'up');
			td.attr('time', bot.last);
			td.text(toTimer(bot.last));
			row.append(td);

			td = $(document.createElement('td'));
			td.addClass('timer');
			td.attr('time', bot.next);
			td.text(toTimer(bot.next));
			row.append(td);

			td = $(document.createElement('td'));
			var link = $('<button type="button" class="btn btn-info btn-xs"><i class="fa fa-eye mr5"></i>Details</button>');
			link.click(function (e) { showBotDetails(bot); });
			td.append(link);
			row.append(td);

			td = $(document.createElement('td'));
			var link = $('<button type="button" class="btn btn-warning btn-xs"><i class="fa fa-upload mr5"></i>Send Bid</button>');
			link.click(function (e) { sendBid(bot); });
			td.append(link);
			row.append(td);

			if ((bid_sbd > 0 || bid_steem > 0) && bot.next < 0.16 * HOURS && bot.last > 0.5 * HOURS) {
				row.addClass('green-bg');

				if (!bot.notif) {
					sendNotification(bot.name, bid_sbd);
					bot.notif = true;
				}
			} else
				bot.notif = false;

			if(bot.power == 100 && bot.last > 4 * HOURS || bot.power < 90)
			  row.addClass('red-light-bg');

			$('#bots_table tbody').append(row);
			$('[data-toggle="tooltip"]').tooltip();
		}
	}
   
    function formatCurrencyVote(bot) {
      switch (CURRENCY) {
        case 'SBD':
          return (bot.vote_usd / sbd_price).formatMoney() + ' SBD';
          break;
        case 'STEEM':
          return (bot.vote_usd / steem_price).formatMoney() + ' STEEM';
          break;
        case 'USD':
          return '$' + bot.vote_usd.formatMoney();
          break;
        case 'POST REWARDS':
          return '$' + bot.vote.formatMoney();
          break;
      }
    }

    function formatCurrencyTotal(bot) {
      switch (CURRENCY) {
        case 'SBD':
          return (bot.total_usd / sbd_price).formatMoney() + ' SBD';
          break;
        case 'STEEM':
          return (bot.total_usd / steem_price).formatMoney() + ' STEEM';
          break;
        case 'USD':
          return '$' + bot.total_usd.formatMoney();
          break;
        case 'POST REWARDS':
          return '$' + ((bot.total_usd / bot.vote_usd) * bot.vote).formatMoney();
          break;
      }
    }

    function sumBids(round, currency) {
      return round.bids.reduce(function(total, bid) {
        if(getCurrency(bid.data.amount) == currency)
          return total + parseFloat(bid.data.amount);
        else
          return total;
      }, 0);
    }

    function showBotDetails(bot) {
        $('#bid_details_bot').text(bot.name);

        var cur_table = $('#bid_details_table_cur tbody');
        cur_table.empty();
        var last_table = $('#bid_details_table_last tbody');
        last_table.empty();

        if (bot.rounds && bot.rounds.length > 0) {
          var round = bot.rounds[bot.rounds.length - 1];
          populateRoundDetailTable(cur_table, bot, round);

          $('#cur_round_vote').text(formatCurrencyVote(bot) + ' (' + (bot.interval / 2.4 * 100) + '%)');
          $('#cur_round_bids').text(sumBids(round, 'SBD').formatMoney() + ' SBD' + (bot.accepts_steem ? ' & ' + sumBids(round, 'STEEM').formatMoney() + ' STEEM' : ''));
          $('#cur_round_value').text('$' + bot.total_usd.formatMoney());
          $('#cur_round_roi').text((((bot.vote_usd * AUTHOR_REWARDS / round.total_usd) - 1) * 100).formatMoney() + '% (After Curation)');
        }

        if (bot.rounds && bot.rounds.length > 1) {
          var round = bot.rounds[bot.rounds.length - 2];
          populateRoundDetailTable(last_table, bot, round);
          $('#last_round_vote').text(formatCurrencyVote(bot) + ' (' + (bot.interval / 2.4 * 100) + '%)');
          $('#last_round_bids').text(sumBids(round, 'SBD').formatMoney() + ' SBD' + (bot.accepts_steem ? ' & ' + sumBids(round, 'STEEM').formatMoney() + ' STEEM' : ''));
          $('#last_round_value').text('$' + round.total_usd.formatMoney());
          $('#last_round_roi').text((((bot.vote_usd * AUTHOR_REWARDS / round.total_usd) - 1) * 100).formatMoney() + '% (After Curation)');
        }

        $('#cur_round_show').click(function (e) {
            $('#cur_round').show();
            $('#cur_round_show').parent().addClass('active');
            $('#last_round').hide();
            $('#last_round_show').parent().removeClass('active');
        });

        $('#last_round_show').click(function (e) {
            $('#cur_round').hide();
            $('#cur_round_show').parent().removeClass('active');
            $('#last_round').show();
            $('#last_round_show').parent().addClass('active');
        });

        $('#bid_details').modal();
    }

    function populateRoundDetailTable(table, bot, round) {
        round.bids.forEach(function (bid) {
            var amount = parseFloat(bid.data.amount);
            var bid_value = getUsdValue(bid.data);
            var currency = getCurrency(bid.data.amount);
            var row = $(document.createElement('tr'));

            var td = $(document.createElement('td'));
            var link = $(document.createElement('a'));
            link.attr('href', 'http://www.steemit.com/@' + bid.data.from);
            link.attr('target', '_blank');
            link.text('@' + bid.data.from);

            if (bid.invalid) {
                var icon = $('<span class="fa fa-warning mr5 color-white" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Invalid Post"></span>&nbsp;');
                td.append(icon);
                row.addClass('red-light-bg');
            }

            td.append(link);
            row.append(td);

            var td = $(document.createElement('td'));
            td.text(amount.formatMoney() + ' ' + currency);
            td.css('text-align', 'right');
            row.append(td);

            var td = $(document.createElement('td'));
            td.text('$' + ((currency == 'SBD') ? amount * sbd_price : amount * steem_price).formatMoney());
            td.css('text-align', 'right');
            row.append(td);

            var td = $(document.createElement('td'));
            td.text((bid_value / round.total_usd * 100).formatMoney() + '%');
            td.css('text-align', 'right');
            row.append(td);

            var value = ((bid_value / round.total_usd) * parseFloat(formatCurrencyVote(bot).replace(/[$,]/g, ''))).formatMoney();

            if(CURRENCY == 'SBD' || CURRENCY == 'STEEM')
              value = value + ' ' + CURRENCY;
            else
              value = '$' + value;

            var td = $(document.createElement('td'));
            td.text(value);
            td.css('text-align', 'right');
            row.append(td);

            var td = $(document.createElement('td'));
            var div = $(document.createElement('div'));
            div.css('width', '250px');
            div.css('overflow', 'hidden');
            div.css('height', '23px');

            var link = $(document.createElement('a'));
            link.attr('href', bid.data.memo);
            link.attr('target', '_blank');
            link.text(bid.data.memo);
            div.append(link);
            td.append(div);
            row.append(td);

            table.append(row);
        });
    }

    var _dialog = null;

    function sendBid(bot) {
      $('#bid_details_dialog_bot_name').text(bot.name);
      $('#bid_details_error').hide();
      $('#bid_details_btn_submit').click(submitBid);
      $('#bid_details_post_url').val('');
      $('#bid_details_bid_amount').val(bot.min_bid)
      $('#bid_details_bid_amount').attr("min", bot.min_bid);
      _dialog = $('#bid_details_dialog').modal();
      _dialog.off('hidden.bs.modal');
      _dialog.bot = bot;

      var account_name = user ? user.name : localStorage.getItem('bid_details_account_name');
      if (account_name) {
        $('#bid_details_account_name').val(account_name);
        loadRecentPosts();
      }
    }

    function submitBid() {
      var to = $('#bid_details_dialog_bot_name').text();
      var from = $('#bid_details_account_name').val();
      var amount = $('#bid_details_bid_amount').val();
      var currency = $('#bid_details_bid_currency').val();
      var url = $('#bid_details_post_url').val();

      checkPost(_dialog.bot, url, amount, currency, function (error) {
        if (error) {
          $('#bid_details_error').html('<b>Error:</b> ' + error);
          $('#bid_details_error').show();
        } else {
          _dialog.on('hidden.bs.modal', function (e) {
            $('#bid_dialog_bot_name').text(to);
            $('#bid_dialog_frame').attr('src', 'https://v2.steemconnect.com/sign/transfer?from=' + from + '&to=' + to + '&amount=' + amount + ' ' + currency + '&memo=' + url);
            _dialog = $('#bid_dialog').modal();
          });

          _dialog.modal('hide');
        }
      });
    }

    function loadRecentPosts() {
      var author =  $('#bid_details_account_name').val();
      var holder = $("#bid_details_recent_posts");
      var cutoff = new Date().getTime() - ((_dialog.bot.max_post_age ? _dialog.bot.max_post_age : 6) * 24 * 60 * 60 * 1000);

      steem.api.getDiscussionsByAuthorBeforeDate(author, null, new Date().toISOString().split('.')[0], 5, function (err, result) {
        var posts = result.filter(function(p) { return new Date(p.created).getTime() > cutoff });

        if (posts.length > 0) {
          holder.empty()
        } else {
          holder.html('None Found');
        }

        posts.forEach(function(post) {
          var linktext = post.title.length > 25 ? post.title.substring(0,22) + '...' : post.title;
          var button = $('<button type="button" class="btn btn-info btn-xs" style="margin: 0 5px;">' + linktext + '</button>');
          holder.append(button);
          button.click(function() {
            $("#bid_details_post_url").val('https://steemit.com' + post.url);
          })
        })
      });
    }

    //setTimeout(start, 5000);

    function start() {
      console.log('Starting!');

      if (steem_vars_loaded >= 3) {
        loadBotInfo();
        loadAccountInfo();
        setInterval(updateTimers, 1000);
      } else
        setTimeout(start, 5000);
    }

    $('#curation_option').on('change', function () {
        if(this.checked) {
            AUTHOR_REWARDS = 0.75;
        } else {
            AUTHOR_REWARDS = 1;
        }
        showBidBots();
    });

    //remember currency choice
    if (!localStorage.hasOwnProperty('currency_list')) {
      localStorage.setItem('currency_list', 'USD');
    } else {
      $('#currency_list').val(localStorage.getItem('currency_list'));
      CURRENCY = localStorage.getItem('currency_list');
    }

    $('#currency_list').change(function () {
      CURRENCY = $('#currency_list').val();
      localStorage.setItem('currency_list', CURRENCY);
      showBidBots();
    });

    $('#min_vote_slider').slider();

    $('#bid_details_account_name').on("change", function(e) {
      localStorage.setItem('bid_details_account_name', $('#bid_details_account_name').val());
      loadRecentPosts();
    });

    //remember slider choice
    if (!localStorage.hasOwnProperty('min_vote_slider')) {
      localStorage.setItem('min_vote_slider', MIN_VOTE);
    } else {
      $('#min_vote_slider').slider('setValue', localStorage.getItem('min_vote_slider'));
      MIN_VOTE = parseFloat(localStorage.getItem('min_vote_slider'));
    }

    $('#min_vote_slider').on("slide", function(e) {
      if(e.value != MIN_VOTE) {
        MIN_VOTE = parseFloat(e.value);
        localStorage.setItem('min_vote_slider', e.value);
        showBidBots();
      }
    });

    $('#calculate_vote').click(function() {
      var bot = null;
      var name = $('#bot_list').val();

      bots.forEach(function(b) {
        if(b.name == name)
          {
            bot = b;
            return;
          }
      });

      var currency = $('#calc_currency').val();
      var bid = parseFloat($('#bid_amount').val());
      var value = bid / (bid + bot.total) * bot.vote_usd;
      var value_sbd = (bid / (bid + bot.total) * bot.vote) / 2;
      var value_steem = ((bid / (bid + bot.total) * bot.vote) / 2 / steem_price);
      var bid_value = (currency == 'SBD') ? bid * sbd_price : bid * steem_price;

      $('#bid_value').text('$' + bid_value.formatMoney());
      $('#vote_value').text('$' + value.formatMoney() + ' = ' + value_sbd.formatMoney() + ' SBD + ' + value_steem.formatMoney() + ' STEEM');
      $('#vote_value_net').text('$' + (value * 0.75).formatMoney() + ' = ' + (value_sbd * 0.75).formatMoney() + ' SBD + ' + (value_steem * 0.75).formatMoney() + ' STEEM');

      $('#vote_value').css('color', (value >= bid_value) ? '#008800' : '#FF0000');
      $('#vote_value_net').css('color', ((value * 0.75) >= bid_value) ? '#008800' : '#FF0000');

      return false;
    });

    // Show disclaimer message
    setTimeout(function () { $('#disclaimer').modal(); }, 2000);

    $('#filter_verified').click(function () { toggleFilter('verified'); });
    $('#filter_refund').click(function () { toggleFilter('refund'); });
    $('#filter_steem').click(function () { toggleFilter('steem'); });
    $('#filter_funding').click(function () { toggleFilter('funding'); });
    $('#filter_nocomment').click(function () { toggleFilter('nocomment'); });

    var _filter = {};
    function toggleFilter(filter) {
      _filter[filter] = !_filter[filter];
      $('#filter_' + filter).css('border', _filter[filter] ? '2px solid green' : 'none');
      showBidBots();
    }

    $('#minnowbooster-submit').click(function () { sendBid({ name: 'minnowbooster', min_bid: 0.01, max_post_age: 6.3 }); });
    $('#randowhale-submit').click(function () { sendBid({ name: 'randowhale', min_bid: 1, max_post_age: 3.5 }); });
    $('#smartsteem-submit').click(function () { sendBid({ name: 'smartmarket', min_bid: 0.1, max_post_age: 6.3 }); });

    // Initialize and try to log in with SteemConnect V2
    var token = getURLParameter('access_token') ? getURLParameter('access_token') : localStorage.getItem('access_token');
    sc2.init({
      baseURL: 'https://v2.steemconnect.com',
      app: 'bottracker.app',
      accessToken: token,
      callbackURL: 'https://steembottracker.com',
      scope: ['login', 'vote']
    });

    var user = null;
    sc2.me(function (err, result) {
      if (result && !err) {
        console.log(result);
        user = result.account;
        $('#btn_login').hide();
        $('#user_info').show();
        $('#login_info').text('@' + user.name);
        localStorage.setItem('access_token', token);
      } else {
        $('#btn_login').show();
        $('#user_info').hide();
      }
    });

    $('#btn_logout').click(function () {
      localStorage.removeItem('access_token');
      window.location.href = window.location.pathname;
    });

    $('#btn_bid_history').click(function () {
      $('#user_bids').modal();
      loadUserBids();
    });

    function loadUserBids() {
      steem.api.getAccountHistory(user.name, -1, 1000, function (err, result) {
        var bids = [];
        var num_loaded = 0;

        for (var i = 0; i < result.length; i++) {
          var trans = result[i];
          var op = trans[1].op;
          var bid = op[1];

          if (op[0] == 'transfer' && bot_names.indexOf(bid.to) >= 0) {
            // Check that the memo is a valid post or comment URL.
            if (!checkMemo(bid.memo))
              continue;

            bids.push(bid);
            loadUserContent(bid, function () {
              num_loaded++;

              if (num_loaded >= bids.length) {
                console.log(bids);
                populateUserBids(bids);
              }
            });
          } else if (op[0] == 'transfer' && bot_names.indexOf(op[1].from) >= 0) {
            // This means the bid was refunded
            var bid = bids.find(function (b) { return b.to == op[1].from && b.amount == op[1].amount; });

            if (bid)
              bid.refunded = true;
          }
        }
      });
    }

    function loadUserContent(bid, callback) {
      var permLink = bid.memo.substr(bid.memo.lastIndexOf('/') + 1);
      var author = bid.memo.substring(bid.memo.lastIndexOf('@') + 1, bid.memo.lastIndexOf('/'));

      steem.api.getContent(author, permLink, function (err, result) {

        if (!err && result && result.id > 0) {
          var vote = result.active_votes.find(function (v) { return v.voter == bid.to });

          if (vote) {
            bid.vote_rshares = vote.rshares;
            bid.vote_percent = vote.percent;
          }

          bid.title = result.title;
        } else
          console.log(err);

        if (callback)
          callback();
      });
    }

    function populateUserBids(bids) {
      var table = $('#user_bids_table tbody');
      table.empty();
      $('#user_bids_name').text(user.name);

      bids.reverse();

      bids.forEach(function (bid) {
        if (!bid.title)
          return;

        var amount = parseFloat(bid.amount);
        var bid_value = getUsdValue(bid);
        var currency = getCurrency(bid.amount);
        var row = $(document.createElement('tr'));

        var td = $(document.createElement('td'));
        var link = $(document.createElement('a'));
        link.attr('href', bid.memo);
        link.attr('target', '_blank');
        link.text(bid.title.length > 30 ? bid.title.substr(0, 30) + '...' : bid.title);
        td.append(link);
        row.append(td);

        var td = $(document.createElement('td'));
        var link = $(document.createElement('a'));
        link.attr('href', 'https://steemit.com/@' + bid.to);
        link.attr('target', '_blank');
        link.text('@' + bid.to);
        td.append(link);
        row.append(td);

        var td = $(document.createElement('td'));
        td.text(amount.formatMoney() + ' ' + currency + (bid.refunded ? ' (refunded)' : ''));
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text('$' + bid_value.formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text((bid.refunded || !bid.vote_rshares) ? '--' : (bid.vote_percent / 100).formatMoney() + '%');
        td.css('text-align', 'right');
        row.append(td);

        var vote_value = bid.vote_rshares * rewardBalance / recentClaims * steemPrice;
        var td = $(document.createElement('td'));
        td.text((bid.refunded || !bid.vote_rshares) ? '--' : '$' + vote_value.formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text((bid.refunded || !bid.vote_rshares) ? '--' : '$' + (vote_value / 2 * sbd_price + vote_value / 2).formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text((bid.refunded || !bid.vote_rshares) ? '--' : (((vote_value / 2 * sbd_price + vote_value / 2) / bid_value - 1) * 100).formatMoney() + '%');
        td.css('text-align', 'right');
        row.append(td);

        table.append(row);
      });
    }

    function loadFrontRunnerPosts() {
      var big_bots = bots.filter(function(b) { return b.vote >= 100; });
      var posts = [];
      var l = big_bots.length;

      for (var i = 0; i < l; i++) {
        var bot = big_bots[i];

        if (!bot.rounds || bot.rounds.length == 0)
          continue;

        var bids = bot.rounds[bot.rounds.length - 1].bids.filter(function(b) { return parseFloat(b.data.amount) >= 10; });

        for (var j = 0; j < bids.length; j++) {
          var bid = bids[j];
          var post = posts.find(function(p) { return p.memo == bid.data.memo; });

          var bid_value = getUsdValue(bid.data);
          var vote_value = bot.vote * (bid_value / (bot.vote_usd * AUTHOR_REWARDS));

          if (post) {
            if(!post.currency)
              post.currency = getCurrency(post.amount);

            post.amount = parseFloat(post.amount) + parseFloat(bid.data.amount);
            post.bots.push(bot.name);
            post.vote_value += vote_value;
          } else {
            bid.data.bots = [bot.name];
            bid.data.vote_value = vote_value;
            posts.push(bid.data);
          }
        }
      }

      var num_loaded = 0;
      posts.forEach(function (post) {
        var permLink = post.memo.substr(post.memo.lastIndexOf('/') + 1);
        var author = post.memo.substring(post.memo.lastIndexOf('@') + 1, post.memo.lastIndexOf('/'));

        steem.api.getContent(author, permLink, function (err, result) {
          if (!err && result && result.id > 0) {
            post.created = new Date(result.created + 'Z');
            post.payout = parseFloat(result.pending_payout_value);
            post.title = result.title;
            post.author = result.author;
            post.permlink = result.permlink;

            var pre_30_min_pct = Math.min(new Date() - new Date(result.created + 'Z'), FULL_CURATION_TIME) / FULL_CURATION_TIME;
            post.curation_reward = (Math.sqrt((post.payout + 1) * 0.25) - Math.sqrt(post.payout * 0.25)) * Math.sqrt((post.payout + 1 + post.vote_value) * 0.25) * pre_30_min_pct;

            if(user) {
              post.voted = (result.active_votes.find(function(v) { return v.voter == user.name; }) != null);
            }
          }

          num_loaded++;

          if(num_loaded >= posts.length) {
            posts.sort(function (a, b) { return parseFloat(b.curation_reward) - parseFloat(a.curation_reward) });
            populateFrontRunnerPosts(posts);
          }
        });
      });
    }

    function populateFrontRunnerPosts(posts) {
      var table = $('#front_runner_table tbody');
      table.empty();

      posts.forEach(function (post) {
        if (!post.title)
          return;

        var row = $(document.createElement('tr'));

        var td = $(document.createElement('td'));
        var link = $(document.createElement('a'));
        link.attr('href', 'https://steemit.com/@' + post.author);
        link.attr('target', '_blank');
        link.text('@' + post.author);
        td.append(link);
        row.append(td);

        var td = $(document.createElement('td'));
        var link = $(document.createElement('a'));
        link.attr('href', post.memo);
        link.attr('target', '_blank');
        link.text(post.title.length > 40 ? post.title.substr(0, 40) + '...' : post.title);
        td.append(link);
        row.append(td);

        var td = $(document.createElement('td'));
        td.text('$' + post.payout.formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text('$' + parseFloat(post.amount).formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text('$' + post.vote_value.formatMoney());
        td.css('text-align', 'right');
        row.append(td);

        var td = $(document.createElement('td'));
        td.text('$' + post.curation_reward.formatMoney() + ' / $1');
        td.css('text-align', 'right');
        row.append(td);

        td = $(document.createElement('td'));
        if(post.voted) {
          td.text('Voted');
        } else {
          var link = $('<button type="button" class="btn btn-info btn-xs"><i class="fa fa-thumbs-up mr5"></i>Upvote</button>');
          link.click(function (e) {
            if(!user)
              window.location.href=sc2.getLoginURL();
            else {
              td.empty();
              td.text('Voting...');
              sc2.vote(user.name, post.author, post.permlink, 10000, function(err, result) {
                console.log(err, result);

                if(result && !err) {
                  td.text('Success!');
                } else {
                  td.empty();
                  td.append(link);
                }
              });
            }
          });
          td.append(link);
        }

        td.css('text-align', 'center');
        row.append(td);

        table.append(row);
      });
    }

    $('#btn_front_run').click(function() {
      loadFrontRunnerPosts();
      $('#front_runner_dialog').modal();
    });
});
