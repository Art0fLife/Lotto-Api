ALTER TABLE "bets"
ALTER COLUMN "code" TYPE varchar(3)
USING "code"::varchar(3);
