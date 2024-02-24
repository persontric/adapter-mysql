import type {
	Adapter,
	DatabaseSession,
	DatabasePerson,
	RegisterDatabasePersonAttributes,
	RegisterDatabaseSessionAttributes
} from 'persontric'
export class MySQLAdapter implements Adapter {
	private controller:Controller
	private escape_person_tbl_name:string
	private escape_session_tbl_name:string
	constructor(controller:Controller, table_names:TableNames) {
		this.controller = controller
		this.escape_session_tbl_name = name__escape(table_names.session)
		this.escape_person_tbl_name = name__escape(table_names.user)
	}
	public async session__delete(session_id:string):Promise<void> {
		await this.controller.execute(
			`DELETE
			 FROM ${this.escape_session_tbl_name}
			 WHERE id = ?`, [
				session_id
			])
	}
	public async person_session_all__delete(person_id:string):Promise<void> {
		await this.controller.execute(
			`DELETE
			 FROM ${this.escape_session_tbl_name}
			 WHERE person_id = ?`,
			[person_id]
		)
	}
	public async session_person_pair_(
		sessionId:string
	):Promise<[session:DatabaseSession|null, user:DatabasePerson|null]> {
		const [databaseSession, database_person] = await Promise.all([
			this.session_(sessionId),
			this.session_id__person_(sessionId)
		])
		return [databaseSession, database_person]
	}
	public async person_session_all_(person_id:string):Promise<DatabaseSession[]> {
		const result = await this.controller.getAll<SessionSchema>(
			`SELECT *
			 FROM ${this.escape_session_tbl_name}
			 WHERE person_id = ?`,
			[person_id]
		)
		return result.map((val)=>{
			return session_schema__database_session_(val)
		})
	}
	public async session__set(databaseSession:DatabaseSession):Promise<void> {
		const value:SessionSchema = {
			id: databaseSession.id,
			person_id: databaseSession.person_id,
			expire_dts: databaseSession.expire_dts,
			...databaseSession.attributes
		}
		const entries = Object.entries(value).filter(([_, v])=>v !== undefined)
		const columns = entries.map(([k])=>name__escape(k))
		const placeholders = Array(columns.length).fill('?')
		const values = entries.map(([_, v])=>v)
		await this.controller.execute(
			`INSERT INTO ${this.escape_session_tbl_name} (${columns.join(
				', '
			)})
			 VALUES (${placeholders.join(', ')})`,
			values
		)
	}
	public async session_expiration__update(sessionId:string, expire_dts:Date):Promise<void> {
		await this.controller.execute(
			`UPDATE ${this.escape_session_tbl_name}
			 SET expire_dts = ?
			 WHERE id = ?`,
			[expire_dts, sessionId]
		)
	}
	public async expired_session_all__delete():Promise<void> {
		await this.controller.execute(
			`DELETE
			 FROM ${this.escape_session_tbl_name}
			 WHERE expire_dts <= ?`,
			[new Date()]
		)
	}
	private async session_(sessionId:string):Promise<DatabaseSession|null> {
		const result = await this.controller.get<SessionSchema>(
			`SELECT *
			 FROM ${this.escape_session_tbl_name}
			 WHERE id = ?`,
			[sessionId]
		)
		if (!result) return null
		return session_schema__database_session_(result)
	}
	private async session_id__person_(sessionId:string):Promise<DatabasePerson|null> {
		const result = await this.controller.get<UserSchema>(
			`SELECT ${this.escape_person_tbl_name}.*
			 FROM ${this.escape_session_tbl_name}
							INNER JOIN ${this.escape_person_tbl_name} ON ${this.escape_person_tbl_name}.id = ${this.escape_session_tbl_name}.person_id
			 WHERE ${this.escape_session_tbl_name}.id = ?`,
			[sessionId]
		)
		if (!result) return null
		return user_schema__database_user_(result)
	}
}
export interface TableNames {
	user:string;
	session:string;
}
export interface Controller {
	execute(sql:string, args?:any[]):Promise<void>;
	get<T>(sql:string, args?:any[]):Promise<T|null>;
	getAll<T>(sql:string, args?:any[]):Promise<T[]>;
}
interface SessionSchema extends RegisterDatabaseSessionAttributes {
	id:string;
	person_id:string;
	expire_dts:Date|string;
}
interface UserSchema extends RegisterDatabasePersonAttributes {
	id:string;
}
function session_schema__database_session_(raw:SessionSchema):DatabaseSession {
	const { id, person_id, expire_dts: result_expire_dts, ...attributes } = raw
	return {
		person_id,
		id,
		expire_dts:
			result_expire_dts instanceof Date ? result_expire_dts : new Date(result_expire_dts + ' GMT'),
		attributes
	}
}
function user_schema__database_user_(raw:UserSchema):DatabasePerson {
	const { id, ...attributes } = raw
	return {
		id,
		attributes
	}
}
function name__escape(val:string):string {
	return '`' + val + '`'
}
