require 'application_system_test_case'

class RedirectSystemTest < ApplicationSystemTestCase
  scenario 'bad formats' do
    visit '/anything.php'
    assert_current_path '/'

    assert_raises ActionController::RoutingError do
      visit '/anything.zip'
    end
  end

  scenario 'auth error' do
    visit case_path cases(:private_case_1)
    assert_content "You are not authorized to access this page."
  end
end
