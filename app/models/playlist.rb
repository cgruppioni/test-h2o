require 'tagging_extensions'
require 'redcloth_extensions'
require 'ancestry_extensions'

class Playlist < ActiveRecord::Base
  extend AncestryExtensions::ClassMethods
  extend RedclothExtensions::ClassMethods

  include PlaylistableExtensions
  include AncestryExtensions::InstanceMethods
  include TaggingExtensions::InstanceMethods
  include AuthUtilities

  named_scope :public, :conditions => {:public => true, :active => true}

  before_destroy :collapse_children
  has_ancestry :orphan_strategy => :restrict
  #no sql injection here.
  acts_as_list :scope => 'ancestry = #{self.connection.quote(self.ancestry)}'

  acts_as_authorization_object
  acts_as_taggable_on :tags

  searchable(:include => [:tags]) do
    text :display_name
    string :display_name, :stored => true
    string :id, :stored => true
    text :description
    text :name
    string :tag_list, :stored => true, :multiple => true
    string :author 

    boolean :public
    time :created_at
  end

  #has_many :playlist_items, :order => :position
  has_many :playlist_items, :order => "playlist_items.position", :dependent => :destroy
  has_many :roles, :as => :authorizable, :dependent => :destroy

  validates_presence_of :name
  validates_length_of :name, :in => 1..250

  def self.tag_list
    Tag.find_by_sql("SELECT ts.tag_id AS id, t.name FROM taggings ts
      JOIN tags t ON ts.tag_id = t.id
      WHERE taggable_type = 'Playlist'
      GROUP BY ts.tag_id, t.name
      ORDER BY COUNT(*) DESC LIMIT 25")
  end

  def author
    owner = self.accepted_roles.find_by_name('owner')
    owner.nil? ? nil : owner.user.login.downcase
  end

  def display_name
    owners = self.accepted_roles.find_by_name('owner')
    "\"#{self.name}\",  #{self.created_at.to_s(:simpledatetime)} #{(owners.blank?) ? '' : ' by ' + owners.users.collect{|u| u.login}.join(',')}"
  end
  alias :to_s :display_name

  def bookmark_name
    self.name
  end

  def parents
    ItemPlaylist.find_all_by_actual_object_id(self.id).collect { |p| p.playlist_item.playlist_id }.uniq
  end

  def self.cache_options
    options = []
    ['true', 'false'].each do |ann|
      [11, 14, 16].each do |size|
        ['true', 'false'].each do |text|
          ['serif', 'sans-serif'].each do |type|
            options << "ann=#{ann}&size=#{size}&text=#{text}&type=#{type}"
          end
        end
      end
    end
    options
  end

  def relation_ids
    r = self.parents
    i = 0
    while i < r.size
      Playlist.find(r[i]).parents.each do |a|
        next if r.include?(a) 
        r.push(a)
      end
      i+=1
    end
    r
  end

  def collage_word_count
    shown_word_count = 0
    total_word_count = 0
    self.playlist_items.each do |pi|
      if pi.resource_item_type == 'ItemCollage' && pi.resource_item.actual_object
        shown_word_count += pi.resource_item.actual_object.words_shown.to_i
        total_word_count += (pi.resource_item.actual_object.word_count.to_i-1) 
      elsif pi.resource_item_type == 'ItemPlaylist' && pi.resource_item.actual_object
        res = pi.resource_item.actual_object.collage_word_count
        shown_word_count += res[0]
        total_word_count += res[1]
      end
    end
    [shown_word_count, total_word_count]
  end

  def contains_item?(item)
    actual_objects = self.playlist_items.inject([]) do |arr, pi| 
      arr << pi.resource_item.actual_object if pi.resource_item && pi.resource_item.actual_object; arr
    end
    actual_objects.include?(item)
  end
end
