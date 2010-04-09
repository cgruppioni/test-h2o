/* goo-goo gajoob */
jQuery(function(){
    jQuery.extend({
      showReplyContainer: function(questionInstanceId,questionId,repliesContainer,toggleSpeed){
        /* figures out if a question has its replies shown - if it does, it does an Ajax request to get the list
           of replies and then toggles the reply container on the question. 
         */
        jQuery.ajax({
          type: 'GET',
          url: jQuery.rootPath() + 'questions/replies/' + questionId,
          beforeSend: function(){jQuery('#spinner_block').show()},
          success: function(html){
            jQuery('#spinner_block').hide();
            repliesContainer.html(html).toggle(toggleSpeed);
            //We only want to observe the new replies.
            jQuery.observeNewQuestionControl(jQuery('#replies-for-question-' + questionId), questionInstanceId, questionId);
            jQuery.convertTime(jQuery('#replies-for-question-' + questionId),UTC_OFFSET);

          },
          error: function(xhr){
            jQuery('#spinner_block').hide();
            jQuery('div.ajax-error').show().append(xhr.responseText);
          }
        });
      },
      removeReplyContainerFromCookie: function(cookieName,replyContainer){
        /* self documenting - removes a reply container from the tracking cookie. Spawned when a reply container is
           closed. 
         */
        var currentVals = jQuery.unserializeHash(jQuery.cookie(cookieName));
        delete currentVals[replyContainer];
        var cookieVal = jQuery.serializeHash(currentVals);
        jQuery.cookie(cookieName,cookieVal);
      },
      addReplyContainerToCookie: function(cookieName,replyContainer){
        /* See above. Adds a reply container id to the cookie. Spawned when a reply container is shown. 
         */
        var currentVals = jQuery.unserializeHash(jQuery.cookie(cookieName));
        currentVals[replyContainer] = 1;
        var cookieVal = jQuery.serializeHash(currentVals);
        jQuery.cookie(cookieName,cookieVal);
      },
      observeNewQuestionControl: function(element,questionInstanceId,questionId){
        /* Sets up the new question jQuery.dialog() and then populates the form via an ajax call. It then shows
           the dialog containing the form. 
         */
        jQuery(element).find('a.new-question-for').click(function(e){
          var interiorQuestionId = jQuery(this).attr('id').split('-')[4];
          var dialogTitle = 'Add to the discussion';
          jQuery('#new-question-form').dialog({
            bgiframe: true,
            autoOpen: false,
            minWidth: 300,
            width: 450,
            modal: true,
            title: dialogTitle,
            buttons: {
              'Ask Question': function(){
                  jQuery('#new-question-form form').ajaxSubmit({
                    error: function(xhr){
                      jQuery('#spinner_block').hide();
                      jQuery('#new-question-error').show().append(xhr.responseText);
                    },
                    beforeSend: function(){
                      jQuery('#spinner_block').show();
                      jQuery('#new-question-error').html('').hide();
                    },
                    success: function(responseText){
                      jQuery('#spinner_block').hide();
                      //TODO - resolve the "parent" question id and return it in response text.
                      jQuery.updateQuestionInstanceView(questionInstanceId,responseText)
                      jQuery('#new-question-form').dialog('close');
                    }
                  });
              },
              'Cancel': function(){
                jQuery('#new-question-error').html('').hide();
                jQuery(this).dialog('close');
              }
            }
          });
          e.preventDefault();
          jQuery.ajax({
            type: 'GET',
            url: jQuery.rootPath() + 'questions/new',
            data: {'question[question_instance_id]': questionInstanceId, 'question[parent_id]': interiorQuestionId},
            beforeSend: function(){
              jQuery('#spinner_block').show();
            },
            success: function(html){
              jQuery('#spinner_block').hide();
              jQuery('#new-question-form').html(html);
              jQuery('#new-question-form').dialog('open');
            }
          });
        });
      },
      toggleVoteControls: function(){
        /* Do an ajax request to get the votes this user has submitted. Kick ass-feature (if you get the reference,
           you win a cookie).
           This  allows us to cache on the question-question-instance level, instead of on the
           question-question-instance-user level, which would be no kind of caching at all. 
         */
        jQuery.ajax({
          type: 'GET',
          url: jQuery.rootPath() + 'users/has_voted_for/Question',
          error: function(xhr){
            jQuery('div.ajax-error').show().append(xhr.responseText);
          },
          success: function(html){
            var votes = html;
            for(i in votes){
              jQuery("#votes-for-" + i + ' a').addClass('already-voted');
            }
          }
        });
      },

      observeVoteControls: function(element,questionInstanceId,questionId) {
        /* Inits the up/down arrows, ignoring those with an "already-voted" class, which is applied earlier
         */
        jQuery(element).find("a[id*='vote-']").click(function(e){
          e.preventDefault();
          var for_or_against = jQuery(this).attr('id').split('-')[1];
          if(jQuery(this).hasClass('already-voted')){
            return;
          }
          var dispatch_url = (for_or_against == 'for') ? jQuery.rootPath() + 'questions/vote_for' : jQuery.rootPath() + 'questions/vote_against';
          jQuery.ajax({
            type: 'POST',
            url: dispatch_url,
            data: {question_id: questionId, authenticity_token: AUTH_TOKEN},
            beforeSend: function(){
              jQuery('#spinner_block').show();
              jQuery('#ajax-error-' + questionInstanceId).html('').hide();
            },
            error: function(xhr){
              jQuery('#spinner_block').hide();
              jQuery('#ajax-error-' + questionInstanceId).show().append(xhr.responseText);
            },
            success: function(){
              jQuery('#spinner_block').hide();
              jQuery.updateQuestionInstanceView(questionInstanceId,questionId);
            }
          });
        });
      },
      updateQuestionInstanceView: function(questionInstanceId,questionId){
        /* Update the question instance view - most likely because a question/reply has been added or a vote has been cast. 
         */
        jQuery.ajax({
          type: 'GET',
          url: jQuery.rootPath() + 'question_instances/' + questionInstanceId,
          data: {updated_question_id: questionId, sort: jQuery.cookie('sort')},
          success: function(html){
            jQuery('#questions-' + questionInstanceId).html(html); 
            jQuery.observeQuestionControls();
            if(questionId.length > 0){
              jQuery('#question-' + questionId).stop().css("background-color", "#FFFF9C").animate({ backgroundColor: "#FFFFFF"}, 2000);
            }
          }
        });
      },
/*      observeUpdateTimers: function(){
       jQuery('#timer-controls a').click(function(e){
           e.preventDefault();
           var timerSeconds = jQuery(this).attr('id').split('-')[1];
           jQuery('#timer-controls a.selected').removeClass('selected');
           jQuery(this).addClass('selected');
           alert(jQuery('#updated-at').attr('class'));
           clearInterval(jQuery('#updated-at').attr('class'));
           jQuery('#updated-at').attr('class',setInterval("jQuery.updateAutomatically()", timerSeconds * 1000));
           jQuery('#timer-notice').html('updated!').delay(2000).html('');
       }); 
      },
*/
      updateAutomatically: function(){
        /* Poll to see if the server thinks something in this question instance has changed. If it has, update
           the question instance view. 
         */
        var lastUpdated = jQuery('#updated-at').html();
        var questionInstanceId = jQuery('div.questions').attr('id').split('-')[1];
        jQuery.ajax({
          type: 'GET',
          url: jQuery.rootPath() + 'question_instances/updated/' + questionInstanceId,
          beforeSend: function(){jQuery('#spinner_block').show()},
          success: function(html){
            jQuery('#spinner_block').hide();
            if(lastUpdated != html){
              jQuery.updateQuestionInstanceView(questionInstanceId,'');
            }
          },
          error: function(xhr){
            jQuery('#spinner_block').hide();
            jQuery('div.ajax-error').show().append(xhr.responseText);
          }
        });
      },
      observeQuestionInstanceControl: function(){
        /* Observe parts of the question instance list. Set up the edit / new jQuery.dialog(), 
           set up the dispatch URL and then update / reobserve upon successful submission.
        */
        jQuery('a.question-instance-control').click(function(e){
          jQuery('#question-instance-form-container').dialog({
            bgiframe: true,
            autoOpen: false,
            minWidth: 300,
            width: 450,
            modal: true,
            title: 'Question Tool',
            buttons: {
              'Save Question Tool': function(){
                jQuery('#question-instance-form').ajaxSubmit({
                  error: function(xhr){
                    jQuery('#spinner_block').hide();
                    jQuery('#question-instance-error').show().append(xhr.responseText);
                  },
                  beforeSend: function(){
                    jQuery('#spinner_block').show();
                    jQuery('#question-instance-error').html('').hide();
                  },
                  success: function(responseText){
                    jQuery('#spinner_block').hide();
                    jQuery.ajax({
                      type: 'GET',
                      url: jQuery.rootPath() + 'question_instances',
                      beforeSend: function(){
                        jQuery('#spinner_block').show();
                      },
                      success: function(html){
                        jQuery('#spinner_block').hide();
                        jQuery('#question-instance-list').html(html);
                        jQuery("#question-instance-chooser").tablesorter();
                        jQuery.observeQuestionInstanceControl();
                      }
                    });
                    jQuery('#question-instance-form-container').dialog('close');
                  }
                });
              },
              'Cancel': function(){
                jQuery('#question-instance-error').html('').hide();
                jQuery(this).dialog('close');
              }
            }
          });
          e.preventDefault();
          var dispatchUrl = '';
          if(jQuery(this).attr('id').match(/^edit\-question\-instance/) ){
            var question_instance_id = jQuery(this).attr('id').split('-')[3];
            dispatchUrl = jQuery.rootPath() + 'question_instances/' + question_instance_id + '/edit'
          } else {
            dispatchUrl = jQuery.rootPath() + 'question_instances/new'
          }
          jQuery.ajax({
            type: 'GET',
            url: dispatchUrl,
            beforeSend: function(){
              jQuery('#spinner_block').show();
            },
            success: function(html){
              jQuery('#spinner_block').hide();
              jQuery('#question-instance-form-container').html(html);
              jQuery('#question-instance-form-container').dialog('open');
            }
          });
        });
      },
      observeShowReplyControls: function(element,questionInstanceId,questionId,openReplyContainers){
        /* Observe the link that toggles whether or not a reply is shown. invoke the add/remove reply container
           from cookie methods and spawn and ajax update to show the replies.
         */
        var repliesContainer = jQuery('#replies-container-' + questionId);
        jQuery(element).find('a.show-replies').click(function(e){
          e.preventDefault();
          if(repliesContainer.html().length > 0 && repliesContainer.is(':visible')){
            //There's content in here and it's visible. Just hide it.
            repliesContainer.toggle('fast');
            jQuery.removeReplyContainerFromCookie('show-reply-containers','#replies-container-' + questionId);
          } else {
            //There's no content, or there's content and it's invisible. 
            //Get the replies again to ensure fresh content.
            jQuery.addReplyContainerToCookie('show-reply-containers','#replies-container-' + questionId);
            jQuery.showReplyContainer(questionInstanceId,questionId,repliesContainer,'fast');
          }
        });
        if(openReplyContainers['#replies-container-' + questionId] == 1){
          jQuery.showReplyContainer(questionInstanceId,questionId,repliesContainer,0);
        }
      },
      convertTime: function(element,offset){
        jQuery(element).find('.unixtime').each(function(){
          var unixtime = jQuery(this).html();
          var qDate = new Date();
          var localDate = new Date(((unixtime * 1000) + offset) + (qDate.getTimezoneOffset() * 60000) );
          jQuery(this).html(localDate.getHours() + ':' + (localDate.getMinutes() < 10 ? '0' : '') + localDate.getMinutes() + ' ' + (localDate.getMonth() + 1) + '/' + localDate.getDate() + '/' + localDate.getFullYear());
        });
      },
      observeSortControl: function(questionInstanceId){
        jQuery('#sort').each(function(){
            if(jQuery.cookie('sort') && jQuery.cookie('sort') != jQuery(this).val()){
              jQuery(this).val(jQuery.cookie('sort')); 
            }
            jQuery(this).change(function(){
              jQuery.cookie('sort', jQuery(this).val());
              jQuery.updateQuestionInstanceView(questionInstanceId,'');
            });
        });
      },
      observeQuestionControls: function(){
        /* So this figures out the question instance we're in, de-activates the already used vote controls,
           finds the questions that need to be observed and then dispatches to other jQuery methods
           to figure out which questions have their replies show and to observe the controls on each. We're doing it
           it one loop (with .find() restricted sub-loops for each jQuery.observe* method) and this seems to be
           faster than looping through the DOM for each control - unsurprisingly. */
        var questionInstanceId = jQuery('div.questions').attr('id').split('-')[1];
        jQuery.toggleVoteControls();
        jQuery("div[id*='question-']").each(function(){
          var questionId = jQuery(this).attr('id').split('-')[1];
          var openReplyContainers = jQuery.unserializeHash(jQuery.cookie('show-reply-containers'));
          if(jQuery(this).hasClass('question')){
          // It's a question. Init the reply toggles and voting
            jQuery.observeShowReplyControls(this,questionInstanceId,questionId,openReplyContainers);
            jQuery.observeVoteControls(this,questionInstanceId,questionId);
          }
          jQuery.observeNewQuestionControl(this,questionInstanceId,questionId);
          jQuery.convertTime(this,UTC_OFFSET);
        });
      }

  });

    jQuery(document).ready(function(){
      if(jQuery(".question-instance-control").length > 0){
        // We're on the question instance list page.
        jQuery.observeQuestionInstanceControl();
        if(jQuery('#question-instance-chooser').length > 0){
          jQuery("#question-instance-chooser").tablesorter();
        }
      } else {
        // We're viewing a question instance.
        var questionInstanceId = jQuery('div.questions').attr('id').split('-')[1];
        jQuery.observeNewQuestionControl(jQuery('#controls-' + questionInstanceId),questionInstanceId,0);
        jQuery.observeSortControl(questionInstanceId);
        jQuery.observeQuestionControls();
//        jQuery.observeUpdateTimers();
        setInterval("jQuery.updateAutomatically()",10000);
//        jQuery('#timer-controls #seconds-5').addClass('selected');
      }
  });
});
