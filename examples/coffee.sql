begin;

create schema if not exists coffee;
create table coffee.coffee_time (dow int primary key, time time);
insert into coffee.coffee_time (dow, time) select t, '0900' from generate_series(0, 6) t;

commit;
