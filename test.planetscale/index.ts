import { database_person, test_adapter } from '@persontric/adapter-test'
import { connect } from '@planetscale/database'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { PlanetScaleAdapter } from '../driver/planetscale.js'
dotenv.config({
	path: resolve('.env')
})
const connection = connect({
	host: process.env.PLANETSCALE_HOST,
	username: process.env.PLANETSCALE_USERNAME,
	password: process.env.PLANETSCALE_PASSWORD
})
await connection.execute('DROP TABLE IF EXISTS user_session')
await connection.execute('DROP TABLE IF EXISTS test_user')
await connection.execute(`CREATE TABLE IF NOT EXISTS test_user (
	id
	VARCHAR (
	255) PRIMARY KEY,
	login VARCHAR (
	255) NOT NULL UNIQUE
	)`)
await connection.execute(`CREATE TABLE IF NOT EXISTS user_session (
	id
	VARCHAR (
	255) PRIMARY KEY,
	user_id VARCHAR (
	255) NOT NULL,
	expires_at DATETIME NOT NULL,
	country VARCHAR (
	255)
	)`)
await connection.execute('INSERT INTO test_user (id, login) VALUES (?, ?)', [
	database_person.id,
	database_person.attributes.login
])
const adapter = new PlanetScaleAdapter(connection, {
	user: 'test_user',
	session: 'user_session'
})
await test_adapter(adapter)
await connection.execute('DROP TABLE IF EXISTS user_session')
await connection.execute('DROP TABLE IF EXISTS test_user')
process.exit()
declare module 'persontric' {
	interface Register {
		Persontric:typeof adapter
		DatabasePersonAttributes:{
			login:string
		}
	}
}
