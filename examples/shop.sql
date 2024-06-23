begin;

create extension if not exists "uuid-ossp";

create or replace function uuid() returns uuid as $$
	select uuid_generate_v4()
$$ language sql;

drop schema shop cascade;
create schema shop;


create table shop.products (
	_id uuid primary key default uuid(),
	name text not null,

	c timestamp not null default now(),
	price float not null
);


-- @NOTE very simple one user
create table shop.user_basket (
	product uuid primary key references shop.products on delete cascade,
	amount int not null
);


create table shop.orders (
	_id uuid primary key default uuid(),
	c timestamp not null default now()
);

create table shop.order_products (
	"shop.order" uuid references shop.orders not null,
	product uuid not null references shop.products on delete set null,
	amount int not null,
	price float not null
);


---
-- Tests
---

insert into shop.products (name, price) values ('laptop', 420.69);
insert into shop.products (name, price) values ('server', 1337.00);

insert into shop.user_basket (product, amount) select _id, 2 from shop.products;

insert into shop.orders default values;

insert into shop.order_products
	select o._id, ub.product, ub.amount, (ub.amount * p.price)
	from shop.orders o, shop.user_basket ub, shop.products p where p._id = ub.product
;

select * from shop.order_products;

commit;
--rollback;
