-- Add acak_soal column to asesmen table
-- This column tracks whether the soal (questions) order is randomized for this assessment

ALTER TABLE asesmen
ADD COLUMN acak_soal BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN asesmen.acak_soal IS 'Flag to indicate if soal (questions) order is randomized for students';
