// UserRoutes.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import UserController from './UserController';
import { UserService } from './UserService';
import { User } from './types';

interface UserRoutesProps {
  users: User[];
}

const UserRoutes: React.FC<UserRoutesProps> = ({ users }) => {
  const userService = new UserService(users);

  return (
    <Router>
      <Switch>
        <Route path="/users" exact>
          <UserController userService={userService} />
        </Route>
        <Route path="/users/:userId" exact>
          {({ match }) => {
            const userId = match?.params.userId;
            if (!userId) {
              return <div>Error: User ID is required</div>;
            }
            return <UserController userService={userService} />;
          }}
        </Route>
        <Route path="*">
          <div>404 Not Found</div>
        </Route>
      </Switch>
    </Router>
  );
};

export default UserRoutes;
