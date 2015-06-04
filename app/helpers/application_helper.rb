# Methods added to this helper will be available to all templates in the application.
module ApplicationHelper
  def item_date_stamp(item)
     if params[:controller] == 'users'
      item.updated_at
    else
      item.created_at
    end.strftime("%m/%d/%Y")
  end

  def results_display(collection, klass_facets, klass_label_map)
    return pluralize(collection.results.total_entries, 'Result') if klass_facets.nil?

    r_display = []

    klass_facets.each do |row|
      if klass_label_map.has_key?(row.value)
        r_display << pluralize(row.count, klass_label_map[row.value])
      else
        r_display << pluralize(row.count, row.value)
      end
    end
    r_display.join(', ')
  end

  def footer_links
    Rails.cache.fetch('footer-links') do
      Page.where(:footer_link => true).order(:footer_sort)
    end
  end

  def help_links
    Rails.cache.fetch('help-links') do
      Page.where(:is_user_guide => true).order(:user_guide_sort)
    end
  end

  def url_for_iframe(single_resource)
    url_or_path_for_iframe(single_resource, :url)
  end

  def path_for_iframe(single_resource)
    url_or_path_for_iframe(single_resource, :path)
  end

  def url_or_path_for_iframe(single_resource, method)
    case single_resource
    when Playlist, Collage, TextBlock
      send("iframe_show_#{method}", type: single_resource.class.table_name, id: single_resource.id)
    else
      fail "Unknown single_resource type: #{single_resource.class}"
    end
  end

  def raw_annotations_for(collage)
    { single: collage.annotations.inject({}) { |h, a| h["a#{a.id}"] = a.to_json(:include => :layers); h } }
  end
end
