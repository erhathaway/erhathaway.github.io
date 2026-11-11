/* eslint-disable @typescript-eslint/no-explicit-any */

const STEPS = [
	'leftJoin',
	'innerJoin',
	'where',
	'orderBy',
	'values',
	'set',
	'returning',
	'onConflictDoNothing'
];

/** Stands in for a Drizzle query: every builder step returns the same chain, and awaiting it yields the rows. */
export const query = (rows: unknown[], onStep?: (step: string) => void) => {
	const chain: any = {
		then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
			Promise.resolve(rows).then(resolve, reject)
	};
	for (const step of STEPS) {
		chain[step] = () => {
			onStep?.(step);
			return chain;
		};
	}
	return chain;
};

type Writes = { inserted?: unknown[]; updated?: unknown[]; deleted?: unknown[] };

/**
 * A database whose selects answer with the rows given for the table they read from, and whose
 * writes return the rows given. `steps` records the builder steps of each select, by table.
 */
export const mockDb = (tables: Array<[unknown, unknown[]]> = [], writes: Writes = {}) => {
	const rowsByTable = new Map(tables);
	const steps = new Map<unknown, string[]>();
	const db: any = {
		select: () => ({
			from: (table: unknown) => {
				const taken: string[] = steps.get(table) ?? [];
				steps.set(table, taken);
				return query(rowsByTable.get(table) ?? [], (step) => taken.push(step));
			}
		}),
		insert: () => query(writes.inserted ?? []),
		update: () => query(writes.updated ?? []),
		delete: () => query(writes.deleted ?? [])
	};
	return { db, steps };
};
