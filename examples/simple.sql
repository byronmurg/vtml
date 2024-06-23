begin;

create schema if not exists simple;

create table simple.users (
	name text primary key
);

create table simple.todos (
	_id uuid primary key default uuid(),
	c timestamp not null default now(),
	u timestamp not null default now(),

	owner text not null references simple.users on delete cascade,

	text text not null,
	done boolean not null default false
);

insert into simple.users (name) values ('byron');

--rollback;
commit;
