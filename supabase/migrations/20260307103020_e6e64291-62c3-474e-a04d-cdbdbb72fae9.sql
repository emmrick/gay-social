-- Delete Premium chatbot child nodes
DELETE FROM help_chatbot_nodes WHERE parent_id = 'a0000001-0000-0000-0000-000000000005';
-- Delete Premium chatbot root node
DELETE FROM help_chatbot_nodes WHERE id = 'a0000001-0000-0000-0000-000000000005';
-- Delete Premium FAQ articles
DELETE FROM faq_articles WHERE category = 'Premium';