import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const experiments = sqliteTable(
  "experiments",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    result: text("result").notNull(),
    created: text("created").notNull(),
    published: integer("published").notNull().default(0),
    description: text("description").notNull().default(""),
    creator: text("creator").notNull().default("Research member"),
  },
  (t) => [index("experiments_owner_created").on(t.owner, t.created)],
);
export const datasets = sqliteTable(
  "datasets",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    asset: text("asset").notNull(),
    bars: text("bars").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("datasets_owner").on(t.owner)],
);
export const bookmarks = sqliteTable(
  "bookmarks",
  { owner: text("owner").notNull(), model: text("model").notNull() },
  (t) => [primaryKey({ columns: [t.owner, t.model] })],
);
