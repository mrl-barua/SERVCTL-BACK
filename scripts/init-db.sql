-- Create Servctl database if it doesn't exist
SELECT 'CREATE DATABASE "Servctl"' WHERE NOT EXISTS 
  (SELECT FROM pg_database WHERE datname = 'Servctl')\gexec
