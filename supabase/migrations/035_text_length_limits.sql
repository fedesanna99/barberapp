-- =============================================================
-- Text length limits for user-editable fields.
--
-- The app enforces the same limits in forms/hooks; these database
-- constraints keep direct API writes aligned and protect existing data
-- by truncating rows before the CHECK constraints are added.
-- =============================================================

-- Existing data cleanup
UPDATE profiles
SET display_name = left(display_name, 60)
WHERE display_name IS NOT NULL AND char_length(display_name) > 60;

UPDATE profiles
SET bio = left(bio, 240)
WHERE bio IS NOT NULL AND char_length(bio) > 240;

UPDATE barbers
SET shop_name = left(shop_name, 80)
WHERE shop_name IS NOT NULL AND char_length(shop_name) > 80;

UPDATE barbers
SET city = left(city, 60)
WHERE city IS NOT NULL AND char_length(city) > 60;

UPDATE barbers
SET address = left(address, 160)
WHERE address IS NOT NULL AND char_length(address) > 160;

UPDATE barbers
SET phone = left(phone, 32)
WHERE phone IS NOT NULL AND char_length(phone) > 32;

UPDATE barbers
SET social_link = left(social_link, 200)
WHERE social_link IS NOT NULL AND char_length(social_link) > 200;

UPDATE barbers
SET specialties = left(specialties, 160)
WHERE specialties IS NOT NULL AND char_length(specialties) > 160;

UPDATE posts
SET caption = left(caption, 500)
WHERE caption IS NOT NULL AND char_length(caption) > 500;

UPDATE posts
SET label = left(label, 60)
WHERE label IS NOT NULL AND char_length(label) > 60;

UPDATE user_posts
SET caption = left(caption, 500)
WHERE caption IS NOT NULL AND char_length(caption) > 500;

UPDATE user_posts
SET label = left(label, 60)
WHERE label IS NOT NULL AND char_length(label) > 60;

UPDATE comments
SET content = left(content, 500)
WHERE char_length(content) > 500;

UPDATE reviews
SET comment = left(comment, 500)
WHERE comment IS NOT NULL AND char_length(comment) > 500;

UPDATE direct_messages
SET body = left(body, 2000)
WHERE char_length(body) > 2000;

UPDATE support_messages
SET content = left(content, 2000)
WHERE char_length(content) > 2000;

UPDATE notifications
SET title = left(title, 120)
WHERE char_length(title) > 120;

UPDATE notifications
SET body_html = left(body_html, 1000)
WHERE body_html IS NOT NULL AND char_length(body_html) > 1000;

-- Profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_display_name_len;
ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_len
  CHECK (display_name IS NULL OR char_length(display_name) <= 60);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_bio_len;
ALTER TABLE profiles ADD CONSTRAINT profiles_bio_len
  CHECK (bio IS NULL OR char_length(bio) <= 240);

-- Barbers
ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_shop_name_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_shop_name_len
  CHECK (shop_name IS NULL OR char_length(shop_name) <= 80);

ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_city_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_city_len
  CHECK (city IS NULL OR char_length(city) <= 60);

ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_address_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_address_len
  CHECK (address IS NULL OR char_length(address) <= 160);

ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_phone_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_phone_len
  CHECK (phone IS NULL OR char_length(phone) <= 32);

ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_social_link_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_social_link_len
  CHECK (social_link IS NULL OR char_length(social_link) <= 200);

ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_specialties_len;
ALTER TABLE barbers ADD CONSTRAINT barbers_specialties_len
  CHECK (specialties IS NULL OR char_length(specialties) <= 160);

-- Posts
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_caption_len;
ALTER TABLE posts ADD CONSTRAINT posts_caption_len
  CHECK (caption IS NULL OR char_length(caption) <= 500);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_label_len;
ALTER TABLE posts ADD CONSTRAINT posts_label_len
  CHECK (label IS NULL OR char_length(label) <= 60);

ALTER TABLE user_posts DROP CONSTRAINT IF EXISTS user_posts_caption_len;
ALTER TABLE user_posts ADD CONSTRAINT user_posts_caption_len
  CHECK (caption IS NULL OR char_length(caption) <= 500);

ALTER TABLE user_posts DROP CONSTRAINT IF EXISTS user_posts_label_len;
ALTER TABLE user_posts ADD CONSTRAINT user_posts_label_len
  CHECK (label IS NULL OR char_length(label) <= 60);

-- Social text
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_content_len;
ALTER TABLE comments ADD CONSTRAINT comments_content_len
  CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 500);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_comment_len;
ALTER TABLE reviews ADD CONSTRAINT reviews_comment_len
  CHECK (comment IS NULL OR char_length(comment) <= 500);

ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_body_len;
ALTER TABLE direct_messages ADD CONSTRAINT direct_messages_body_len
  CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000);

ALTER TABLE support_messages DROP CONSTRAINT IF EXISTS support_messages_content_len;
ALTER TABLE support_messages ADD CONSTRAINT support_messages_content_len
  CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2000);

-- Admin notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_title_len;
ALTER TABLE notifications ADD CONSTRAINT notifications_title_len
  CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 120);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_body_html_len;
ALTER TABLE notifications ADD CONSTRAINT notifications_body_html_len
  CHECK (body_html IS NULL OR char_length(body_html) <= 1000);
