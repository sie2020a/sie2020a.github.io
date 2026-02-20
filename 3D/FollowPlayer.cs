using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public class FollowPlayer : MonoBehaviour
{
    public GameManager gameManager;

    private GameObject player;
    private NavMeshAgent agent;
    private Animator anim;
    private Vector3 followerPos;
    private float currentSpeed;

    void Start()
    {
        player = GameObject.FindGameObjectWithTag("Player");
        agent = GetComponent<NavMeshAgent>();
        anim = GetComponent<Animator>();
        followerPos = transform.position;
    }

    void Update()
    {
        if (gameManager != null && gameManager.goal == true)
        {
            agent.enabled = false;
            return;
        }

        if (agent.pathStatus != NavMeshPathStatus.PathInvalid)
        {
            agent.SetDestination(player.transform.position);
        }

        currentSpeed = (transform.position - followerPos).magnitude / Time.deltaTime;
        followerPos = transform.position;
        anim.SetFloat("FollowerSpeed", currentSpeed);
    }
}
